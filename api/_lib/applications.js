import { requireUser, checkOrigin, authError, sendAuthError } from './auth.js';
import { BASE_ID, TABLES, PF } from '../../src/lib/config.js';
import { APPLICATION_TABLE, APPLICATION_LINK, APPLICATION_FIELDS as F, APPLICATION_LANGUAGES, APPLICATION_STATUSES, normalizeApplication, sameApplication } from '../../src/lib/applications.js';

const validId = value => /^rec[A-Za-z0-9]+$/.test(value || '');
let queue = Promise.resolve();
const pending = new Map();

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const { user } = await requireUser(req, env);
    if (req.method !== 'GET') checkOrigin(req, env);
    if (!env.AIRTABLE_API_KEY) throw authError(503, 'Airtable is not configured.');
    const request = (path, method = 'GET', body) => {
      const operation = queue.then(async () => {
        const response = await fetch(`https://api.airtable.com/v0/${path}`, {
          method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw authError(response.status === 404 ? 404 : 503, method !== 'GET' ? 'Submission could not be confirmed. Refresh existing applications before submitting again.' : 'Unable to load Airtable applications. Please retry.');
        return response.json();
      });
      queue = operation.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 225)));
      return operation;
    };
    const editing = req.method === 'PATCH';
    const studentId = req.method !== 'GET' ? req.body?.studentId : new URL(req.url, 'http://internal').searchParams.get('studentId');
    if ((studentId && !validId(studentId)) || (req.method !== 'GET' && !validId(studentId))) throw authError(400, 'Select a valid prospect.');
    if (editing && (!validId(req.body?.applicationId) || typeof req.body?.expected !== 'object' || !req.body.expected)) throw authError(400, 'Select a valid application with its original information.');
    const metadata = await request(`meta/bases/${BASE_ID}/tables`);
    const table = metadata.tables?.find(table => table.id === APPLICATION_TABLE);
    if (!table?.fields?.some(field => field.id === F.submittedBy)) throw authError(503, 'Application schema is incomplete.');
    const options = field => table.fields.find(item => item.id === field)?.options?.choices?.map(choice => choice.name) || [];
    const choices = {
      language: options(F.language).filter(value => APPLICATION_LANGUAGES.includes(value)),
      status: options(F.status).filter(value => APPLICATION_STATUSES.includes(value)),
      degree: options(F.degree),
    };
    if (!studentId) return res.json({ choices, student: null, applications: [] });
    const studentParams = new URLSearchParams({ returnFieldsByFieldId: 'true' });
    // Airtable's single-record endpoint does not accept fields[] projections.
    const studentRecord = await request(`${BASE_ID}/${TABLES.prospects}/${studentId}?${studentParams}`);
    const student = { id: studentRecord.id, fullName: studentRecord.fields?.[PF.fullName] || '', email: studentRecord.fields?.[PF.email] || '', phone: studentRecord.fields?.[PF.phone] || '', reference: studentRecord.fields?.[PF.prospectId] || '', situations: studentRecord.fields?.[PF.situation] || [] };
    const list = async (record = studentRecord) => {
      const ids = (record.fields?.[APPLICATION_LINK] || []).filter(validId);
      const records = [];
      for (let index = 0; index < ids.length; index += 50) {
        const params = new URLSearchParams({ returnFieldsByFieldId: 'true', pageSize: '100', filterByFormula: `OR(${ids.slice(index, index + 50).map(id => `RECORD_ID()='${id}'`).join(',')})` });
        for (const field of Object.values(F)) params.append('fields[]', field);
        const page = await request(`${BASE_ID}/${APPLICATION_TABLE}?${params}`);
        records.push(...(page.records || []).filter(record => record.fields?.[F.student]?.includes(studentId)));
      }
      return records.map(normalizeApplication).sort((a, b) => String(b.candidacyDate).localeCompare(String(a.candidacyDate)));
    };
    if (req.method === 'GET') return res.json({ choices, student, applications: await list() });
    const { input, confirmDuplicate = false } = req.body || {};
    const writable = ['university', 'course', 'language', 'degree', 'city', 'portalUrl', 'passwordHint', 'status', 'candidacyDate', 'answerDate', 'comment'];
    const allowed = editing ? ['studentId', 'input', 'confirmDuplicate', 'applicationId', 'expected'] : ['studentId', 'input', 'confirmDuplicate'];
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !writable.includes(key)) || Object.keys(req.body).some(key => !allowed.includes(key)) || typeof confirmDuplicate !== 'boolean') throw authError(400, 'Invalid application fields.');
    const clean = {};
    for (const key of writable) {
      const value = input[key] ?? '';
      if (typeof value !== 'string' || value.length > (key === 'comment' ? 10000 : 1000)) throw authError(400, 'Invalid application text.');
      clean[key] = value.trim();
    }
    if (!clean.university || !clean.course) throw authError(400, 'University and course are required.');
    for (const key of ['language', 'degree', 'status']) if (!choices[key].includes(clean[key])) throw authError(400, `Select a valid ${key}.`);
    for (const key of ['candidacyDate', 'answerDate']) if (clean[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(clean[key]) || !Number.isFinite(Date.parse(clean[key])) || new Date(clean[key]).toISOString().slice(0, 10) !== clean[key])) throw authError(400, 'Invalid application date.');
    if (clean.status !== 'Proposal' && !clean.candidacyDate) throw authError(400, 'Date of candidacy is required.');
    if (clean.answerDate && clean.candidacyDate && clean.answerDate < clean.candidacyDate) throw authError(400, 'Answer date must be on or after the candidacy date.');
    if (clean.portalUrl) {
      let url; try { url = new URL(clean.portalUrl); } catch { throw authError(400, 'Invalid portal URL.'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw authError(400, 'Use an HTTP or HTTPS portal URL without embedded credentials.');
    }
    const operation = (pending.get(studentId) || Promise.resolve()).catch(() => {}).then(async () => {
      const current = await request(`${BASE_ID}/${TABLES.prospects}/${studentId}?${studentParams}`);
      const existing = await list(current);
      if (editing) {
        const original = existing.find(item => item.id === req.body.applicationId);
        if (!original) throw authError(404, 'This application does not belong to the selected prospect.');
        if ([...writable, 'modifiedAt', 'submittedBy'].some(key => original[key] !== req.body.expected[key])) throw authError(409, 'This application changed. Refresh and select it again before saving.');
      }
      if (!confirmDuplicate && existing.some(item => item.id !== (editing ? req.body.applicationId : null) && sameApplication(item, clean))) throw authError(409, 'A similar application already exists. Review it and confirm if this is a separate candidature.');
      const fields = Object.fromEntries(writable.filter(key => editing || clean[key]).map(key => [F[key], clean[key] || null]));
      if (!editing) {
        fields[F.student] = [studentId];
        fields[F.submittedBy] = `${user.displayName || user.username} (${user.username})`;
      }
      const record = await request(`${BASE_ID}/${APPLICATION_TABLE}${editing ? '/' + req.body.applicationId : ''}`, editing ? 'PATCH' : 'POST', { fields, returnFieldsByFieldId: true });
      return normalizeApplication(record);
    });
    pending.set(studentId, operation);
    try { res.status(editing ? 200 : 201).json({ application: await operation }); } finally { if (pending.get(studentId) === operation) pending.delete(studentId); }
  } catch (error) { sendAuthError(res, error); }
}
