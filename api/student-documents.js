import { randomUUID } from 'node:crypto';
import { requireUser, checkOrigin, authError, sendAuthError, airtable, USERS_TABLE } from './_lib/auth.js';
import { BASE_ID, TABLES } from '../src/lib/config.js';
import { DOCUMENT_TABLES, SOURCE_FIELDS, FOLDER_STATUSES, REVIEW_STATUSES, REQUIREMENTS, buildDocumentItems } from '../src/lib/studentDocuments.js';

const recordId = value => /^rec[A-Za-z0-9]+$/.test(value || '');
let requestQueue = Promise.resolve();
const text = (value, limit = 10000) => { if (typeof value !== 'string' || value.length > limit) throw authError(400, 'Invalid text.'); return value.trim(); };
const date = value => { if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw authError(400, 'Invalid date.'); return value || null; };
export const escapeEmailHtml = value => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { user } = await requireUser(req, env);
    if (!['GET', 'POST'].includes(req.method)) throw authError(405, 'Method not allowed.');
    if (req.method === 'POST') checkOrigin(req, env);
    const studentId = new URL(req.url, 'http://internal').searchParams.get('studentId');
    if (!recordId(studentId)) throw authError(400, 'Invalid student.');
    const execute = async (path, method = 'GET', body, content = false) => {
      const result = await fetch(`https://${content ? 'content' : 'api'}.airtable.com/v0/${content ? '' : BASE_ID + '/'}${path}`, { method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
      if (!result.ok) throw Object.assign(authError(result.status === 404 ? 404 : 503, 'Airtable could not complete this action. Refresh before retrying.'), { upstreamStatus: result.status });
      return result.json();
    };
    const request = (...args) => {
      const result = requestQueue.then(() => execute(...args));
      requestQueue = result.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 225)));
      return result;
    };
    const list = async (table, formula) => {
      const records = []; let offset;
      do { const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' }); if (offset) params.set('offset', offset); const page = await request(table + '?' + params); records.push(...(page.records || [])); offset = page.offset; } while (offset);
      return records;
    };
    const studentRecord = await request(TABLES.prospects + '/' + studentId);
    const student = { id: studentId, name: [studentRecord.fields.Name, studentRecord.fields.Surname].filter(Boolean).join(' '), email: studentRecord.fields.Email || '', reference: studentRecord.fields['Prospect ID'] || '', phase: studentRecord.fields.Phase || (studentRecord.fields['Prospect Situation'] || []).join(', ') };
    const load = async () => {
      const folders = [];
      // Linked-field formulas contain display names, not record IDs. Resolve the inverse links on the student instead.
      for (const source of ['Academic', 'Scholarship']) {
        const ids = (studentRecord.fields[source === 'Academic' ? 'Documents' : 'Bourse-Documents'] || []).filter(recordId);
        for (let index = 0; index < ids.length; index += 50) {
          const formula = 'OR(' + ids.slice(index, index + 50).map(id => `RECORD_ID()='${id}'`).join(',') + ')';
          folders.push(...(await list(DOCUMENT_TABLES[source], formula)).filter(record => record.fields.Prospect?.includes(studentId)).map(record => ({ ...record, source })));
        }
      }
      const reviews = await list(DOCUMENT_TABLES.reviews, `{Student Record ID}='${studentId}'`);
      return { folders, reviews, documents: buildDocumentItems(folders, reviews) };
    };
    if (req.method === 'GET') {
      const data = await load();
      const activity = await list(DOCUMENT_TABLES.activity, `{Student Record ID}='${studentId}'`);
      return res.json({ student, ...data, activity: activity.sort((a, b) => (b.fields['Occurred At'] || '').localeCompare(a.fields['Occurred At'] || '')) });
    }
    const body = req.body || {};
    const actor = `${user.displayName} (${user.username})`;
    const stamp = () => ({ 'Updated At': new Date().toISOString(), 'Updated By': actor });
    const assignee = async id => {
      if (!id) return { 'Assigned User ID': '', 'Assigned User Name': '' };
      if (!recordId(id)) throw authError(400, 'Invalid platform user.');
      const account = await airtable(USERS_TABLE + '/' + id, { env });
      if (account.fields.is_active !== true) throw authError(400, 'Choose an active platform user.');
      return { 'Assigned User ID': id, 'Assigned User Name': `${account.fields.display_name || account.fields.username} (${account.fields.username})` };
    };
    const event = (action, key, details, extra = {}) => request(DOCUMENT_TABLES.activity, 'POST', { fields: { 'Event ID': randomUUID(), 'Student Record ID': studentId, 'Document Key': key || '', Action: action, 'Occurred At': new Date().toISOString(), Actor: actor, 'Actor User ID': user.id, Details: details, Result: 'Pending', ...extra } });
    const finalize = async (audit, result, extra = {}) => { try { await request(DOCUMENT_TABLES.activity + '/' + audit.id, 'PATCH', { fields: { Result: result, ...extra } }); return ''; } catch { return 'Action completed, but history confirmation is pending. Refresh before retrying.'; } };
    const mutate = async (audit, work) => {
      try { const result = await work(); return res.json({ ...result, warning: await finalize(audit, 'Applied') }); }
      catch (error) { if (!error.partial && error.upstreamStatus >= 400 && error.upstreamStatus < 500) await finalize(audit, 'Failed'); throw error; }
    };
    if (body.action === 'email') {
      if (!env.RESEND_API_KEY) throw authError(503, 'Email sending is not configured.');
      const recipient = text(body.recipient, 254), subject = text(body.subject, 200), message = text(body.message, 20000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !subject || !message || !/^[a-f0-9-]{36}$/.test(body.eventId || '')) throw authError(400, 'Recipient, subject and message are required.');
      const prior = await list(DOCUMENT_TABLES.activity, `AND({Student Record ID}='${studentId}',{Event ID}='${body.eventId}')`);
      let audit = prior[0];
      if (audit && (audit.fields.Recipient !== recipient || audit.fields.Subject !== subject || audit.fields.Message !== message || audit.fields.Action !== 'Email')) throw authError(409, 'This send request was already used. Close the email editor and start again.');
      if (audit?.fields.Result === 'Sent') return res.json({ sent: true, providerId: audit.fields['Provider ID'] });
      if (audit && Date.now() - Date.parse(audit.fields['Occurred At']) >= 23 * 3600000) throw authError(409, 'This email request is too old to retry safely. Check the provider before starting a new send.');
      if (!audit) audit = await event('Email', '', 'Email submitted to provider; Sent indicates acceptance, not delivery.', { 'Event ID': body.eventId, Recipient: recipient, Subject: subject, Message: message });
      const result = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'documents-' + body.eventId }, body: JSON.stringify({ from: env.RESEND_FROM_CONTACT || env.RESEND_FROM || 'onboarding@resend.dev', to: [recipient], subject, text: message, html: '<div style="font-family:Arial,sans-serif;white-space:pre-wrap">' + escapeEmailHtml(message) + '</div>' }), signal: AbortSignal.timeout(20000) });
      if (!result.ok) { if (result.status < 500 && result.status !== 429) await finalize(audit, 'Failed'); throw authError(503, 'Email not confirmed. Keep this draft and retry, or check history before sending a new message.'); }
      const sent = await result.json();
      return res.json({ sent: true, providerId: sent.id, warning: await finalize(audit, 'Sent', { 'Provider ID': sent.id || '' }) });
    }
    const data = await load();
    if (body.action === 'request') {
      if (!['Academic', 'Scholarship'].includes(body.source)) throw authError(400, 'Invalid document group.');
      const name = text(body.name, 200); if (!name) throw authError(400, 'Document name is required.');
      const requirement = body.requirement || 'Required'; if (!REQUIREMENTS.includes(requirement)) throw authError(400, 'Invalid requirement.');
      const key = 'requested:' + randomUUID();
      const fields = { 'Document Key': key, 'Student Record ID': studentId, Source: body.source, 'Document Name': name, Requirement: requirement, 'Review Status': 'Missing', 'Internal Note': text(body.note || ''), 'Due Date': date(body.due), ...await assignee(body.assignedTo), ...stamp() };
      const audit = await event('Requested', key, `Requested ${name} (${requirement})${body.due ? ' by ' + body.due : ''}`);
      return await mutate(audit, async () => ({ record: await request(DOCUMENT_TABLES.reviews, 'POST', { fields }) }));
    }
    if (body.action === 'folder') {
      const folder = data.folders.find(folder => folder.id === body.folderId);
      const source = folder?.source || body.source;
      if (!['Academic', 'Scholarship'].includes(source) || (body.folderId && !folder) || !FOLDER_STATUSES[source].includes(body.status)) throw authError(400, 'Invalid student folder or status.');
      const statusField = source === 'Academic' ? 'Documents Status' : 'Statut dossier bourse';
      const fields = { [statusField]: body.status, 'Review Note': text(body.note || ''), 'Review Deadline': date(body.due), ...await assignee(body.assignedTo) };
      if (!folder) { fields.Prospect = [studentId]; if (source === 'Academic') { fields.Name = student.name || studentId; fields['Submission Date'] = new Date().toISOString().slice(0, 10); } else fields['Date soumission'] = new Date().toISOString().slice(0, 10); }
      const audit = await event('Folder updated', folder?.id || '', `${source} folder: ${folder?.fields[statusField] || 'New'} → ${body.status}\n${fields['Review Note']}`);
      return await mutate(audit, async () => ({ record: await request(DOCUMENT_TABLES[source] + (folder ? '/' + folder.id : ''), folder ? 'PATCH' : 'POST', { fields }) }));
    }
    const doc = data.documents.find(doc => doc.key === body.key);
    if (!doc) throw authError(404, 'Document not found in this student file.');
    if (doc.reviewId && body.expectedUpdatedAt !== doc.updatedAt) throw authError(409, 'This document changed. Refresh before saving.');
    const previous = data.reviews.find(review => review.id === doc.reviewId)?.fields || {};
    let fields = { 'Document Key': doc.key, 'Student Record ID': studentId, Source: doc.source, 'Document Name': doc.name, 'Source Record ID': doc.sourceRecordId || previous['Source Record ID'] || '', 'Source Field': doc.sourceField || previous['Source Field'] || '', 'Attachment ID': doc.attachmentId || previous['Attachment ID'] || '', ...stamp() };
    const saveReview = () => request(DOCUMENT_TABLES.reviews + (doc.reviewId ? '/' + doc.reviewId : ''), doc.reviewId ? 'PATCH' : 'POST', { fields });
    if (body.action === 'review') {
      if (!REVIEW_STATUSES.includes(body.status) || !REQUIREMENTS.includes(body.requirement)) throw authError(400, 'Invalid review status or requirement.');
      if (['Received', 'Under review', 'Validated'].includes(body.status) && !doc.files.length) throw authError(400, 'Upload a document before marking it received or validated.');
      const reason = text(body.reason || ''); if (body.status === 'Needs correction' && !reason) throw authError(400, 'Explain the correction required.');
      fields = { ...fields, 'Review Status': body.status, Requirement: body.requirement, 'Internal Note': text(body.note || ''), 'Correction Reason': reason, 'Due Date': date(body.due), ...await assignee(body.assignedTo) };
      const changes = Object.entries(fields).filter(([key, value]) => !['Updated At', 'Updated By'].includes(key) && JSON.stringify(previous[key] ?? '') !== JSON.stringify(value ?? '')).map(([key, value]) => `${key}: ${previous[key] ?? ''} → ${value}`).join('\n');
      const audit = await event('Reviewed', doc.key, doc.name + '\n' + changes);
      return await mutate(audit, async () => ({ record: await saveReview() }));
    }
    if (body.action === 'upload') {
      const filename = text(body.filename, 200);
      if (!/\.(pdf|png|jpe?g|webp|docx?)$/i.test(filename) || !['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(body.contentType)) throw authError(400, 'Use PDF, PNG, JPG, WEBP or Word files.');
      if (typeof body.file !== 'string' || body.file.length > 4 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.file)) throw authError(400, 'Files must be smaller than 3 MB.');
      if (Buffer.from(body.file, 'base64').length > 3 * 1024 * 1024) throw authError(400, 'Files must be smaller than 3 MB.');
      const audit = await event('Uploaded', doc.key, `New version of ${doc.name}: ${filename}. Previous files retained.`);
      return await mutate(audit, async () => {
        const review = doc.reviewId ? { id: doc.reviewId } : await saveReview();
        await request(BASE_ID + '/' + review.id + '/fld2rhsPGgwmmUEo1/uploadAttachment', 'POST', { filename, contentType: body.contentType, file: body.file }, true);
        let result;
        try { result = await request(DOCUMENT_TABLES.reviews + '/' + review.id, 'PATCH', { fields: { 'Review Status': 'Received', ...stamp() } }); }
        catch (error) { throw Object.assign(authError(503, 'File uploaded, but its review status was not confirmed. Refresh before uploading again.'), { partial: true }); }
        return { record: result };
      });
    }
    throw authError(400, 'Unsupported document action.');
  } catch (error) { sendAuthError(res, error); }
}
