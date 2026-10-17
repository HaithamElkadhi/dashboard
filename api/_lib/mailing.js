import { requireUser, checkOrigin, authError, sendAuthError } from './auth.js';
import { BASE_ID, TABLES, FIN, DUE_STATUS } from '../../src/lib/config.js';
import { ONBOARDING_TEMPLATE_ID, SYSTEM_MAIL_TEMPLATES, normalizeMailingStudent, renderOnboarding, validateOnboardingVariables } from '../../src/lib/mailingSystemTemplates.js';
import { MAILING_LOGO_BASE64 } from './mailingLogo.js';
import { EMAIL_HISTORY_TABLE } from '../../src/lib/contactActivity.js';
import { MAX_ATTACHMENT_BYTES, isMailEmail, parseMailCc, validateMailInput, renderMailText, normalizeMailTemplate } from '../../src/lib/mailing.js';
const DEFAULT_ATTACHMENTS_FIELD = 'fldMh2yYS25eewHIM';
const validId = value => /^rec[A-Za-z0-9]+$/.test(value || '');
export function mailingSenders(env) {
  return [['default', 'Principal', env.RESEND_FROM], ['contact', 'Contact', env.RESEND_FROM_CONTACT], ['ecole', 'École', env.RESEND_FROM_ECOLE || env.RESEND_FROM_CONTACT_Ecole]].filter(([, , address]) => address?.trim()).map(([key, label, address]) => ({ key, label, email: address.trim() }));
}
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const { user } = await requireUser(req, env);
    if (req.method === 'POST') checkOrigin(req, env);
    const attachmentField = env.MAILING_ATTACHMENTS_FIELD || DEFAULT_ATTACHMENTS_FIELD;
    const senders = mailingSenders(env), table = encodeURIComponent(env.MAILING_TEMPLATES_TABLE || 'Mailing Templates');
    const request = async (path, method = 'GET', fields) => {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, ...(fields ? { body: JSON.stringify({ fields }) } : {}), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw authError(response.status === 404 || response.status === 403 ? 503 : response.status, 'Stockage Mailing indisponible. Vérifiez la table Airtable et ses accès.');
      return response.json();
    };
    const list = async path => { const records = []; let offset; do { const page = await request(path + (path.includes('?') ? '&' : '?') + new URLSearchParams({ pageSize: '100', ...(offset ? { offset } : {}) })); records.push(...(page.records || [])); offset = page.offset; } while (offset); return records; };
    const resolveAttachments = async files => {
      const cache = new Map(); let total = 0; const resolved = [];
      for (const file of files) {
        let content = file.content;
        if (file.id) {
          if (!cache.has(file.templateId)) cache.set(file.templateId, await request(`${table}/${file.templateId}`));
          const stored = cache.get(file.templateId).fields?.Attachments?.find(item => item.id === file.id);
          if (!stored || stored.filename !== file.filename || stored.size > MAX_ATTACHMENT_BYTES) throw authError(400, 'Pièce jointe du modèle introuvable ou trop volumineuse.');
          const url = new URL(stored.url);
          if (url.protocol !== 'https:' || url.username || url.password || !/^(?:[a-z0-9-]+\.)*(?:airtableusercontent\.com|dl\.airtable\.com)$/.test(url.hostname)) throw authError(400, 'Adresse de pièce jointe invalide.');
          const download = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
          if (!download.ok || Number(download.headers.get('content-length')) > MAX_ATTACHMENT_BYTES) throw authError(503, 'Téléchargement de pièce jointe impossible.');
          const chunks = []; let size = 0;
          for await (const chunk of download.body) { size += chunk.length; if (size + total > MAX_ATTACHMENT_BYTES) throw authError(400, 'Les pièces jointes dépassent 2 Mo au total.'); chunks.push(Buffer.from(chunk)); }
          content = Buffer.concat(chunks).toString('base64');
        }
        total += Buffer.from(content, 'base64').length;
        if (total > MAX_ATTACHMENT_BYTES) throw authError(400, 'Les pièces jointes dépassent 2 Mo au total.');
        resolved.push({ filename: file.filename, content });
      }
      return resolved;
    };
    const getStudent = async id => {
      if (!validId(id)) throw authError(400, 'Choisissez un étudiant.');
      const record = await request(`${TABLES.prospects}/${id}?returnFieldsByFieldId=true`);
      const student = normalizeMailingStudent(record);
      if (!isMailEmail(student.email)) throw authError(400, 'Cet étudiant ne possède pas une adresse email valide.');
      return student;
    };
    if (req.method === 'GET') {
      const result = { senders, templates: SYSTEM_MAIL_TEMPLATES.map(template => ({ ...template, reservedAttachmentBytes: Buffer.from(MAILING_LOGO_BASE64, 'base64').length })), history: [] };
      try { result.templates.push(...(await list(table)).map(normalizeMailTemplate)); } catch (error) { result.warning = error.message; }
      const studentId = new URL(req.url, 'http://internal').searchParams.get('studentId');
      if (studentId) {
        const student = await getStudent(studentId);
        result.student = student;
        result.payments = [];
        try {
          const ids = [...new Set(student.paymentIds || [])];
          if (ids.some(id=>!validId(id))) throw new Error('Invalid payment links');
          const records = [];
          for (let start=0;start<ids.length;start+=50) {
            const batch = ids.slice(start,start+50);
            const params = new URLSearchParams({ returnFieldsByFieldId:'true',filterByFormula:`OR(${batch.map(id=>`RECORD_ID()='${id}'`).join(',')})` });
            records.push(...await list(`${TABLES.paiements}?${params}`));
          }
          if (records.length !== ids.length || new Set(records.map(record=>record.id)).size !== ids.length || records.some(record=>!ids.includes(record.id) || !record.fields?.[FIN.prospects]?.includes(student.id))) throw new Error('Payment ownership mismatch');
          result.payments = records.filter(record=>record.fields[FIN.currency]==='TND' && [DUE_STATUS, 'En retard'].includes(record.fields[FIN.status])).map(record=>({ id:record.id,amount:record.fields[FIN.amount] ?? '',currency:'TND',status:record.fields[FIN.status],dueDate:record.fields[FIN.dueDate] || '' })).sort((a,b)=>(a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
        } catch { result.contextWarning = 'Informations de paiement indisponibles. Renseignez et vérifiez les valeurs manuellement.'; }
        const safeEmail = student.email.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const params = new URLSearchParams({ filterByFormula: `LOWER({Recipient})=LOWER('${safeEmail}')` });
        try { result.history = (await list(`${EMAIL_HISTORY_TABLE}?${params}`)).map(r => ({ id: r.id, subject: r.fields.Subject || '', recipient: r.fields.Recipient || '', sentAt: r.fields['Sent At'] || r.createdTime, actor: r.fields.Actor || '' })).sort((a,b) => b.sentAt.localeCompare(a.sentAt)); } catch { result.warning = [result.warning, 'Historique indisponible.'].filter(Boolean).join(' '); }
      }
      return res.json(result);
    }
    const body = req.body || {};
    if (body.systemTemplateId && body.systemTemplateId !== ONBOARDING_TEMPLATE_ID) throw authError(400,'Modèle système inconnu.');
    if (body.action === 'save-template' && (body.id === ONBOARDING_TEMPLATE_ID || body.systemTemplateId)) throw authError(400,'Le modèle système ne peut pas être modifié.');
    const systemTemplate = body.systemTemplateId === ONBOARDING_TEMPLATE_ID ? SYSTEM_MAIL_TEMPLATES.find(template=>template.id===ONBOARDING_TEMPLATE_ID) : null;
    let input; try { input = validateMailInput(body.action === 'save-template' ? body.input : systemTemplate ? {...body,body:systemTemplate.body} : body, { template: body.action === 'save-template' }); } catch (error) { throw authError(400, error.message); }
    const sender = senders.find(item => item.key === input.fromKey);
    if (!sender) throw authError(400, 'Cet expéditeur n’est pas configuré.');
    if (body.action === 'save-template') {
      if (body.id && !validId(body.id)) throw authError(400, 'Modèle invalide.');
      if (input.attachments.length && !/^fld[A-Za-z0-9]+$/.test(attachmentField)) throw authError(503, 'Configurez MAILING_ATTACHMENTS_FIELD pour enregistrer les pièces jointes.');
      const retained = input.attachments.filter(file => body.id && file.templateId === body.id);
      let retainedBytes = 0;
      if (retained.length) {
        const original = await request(`${table}/${body.id}`);
        if (retained.some(file => !original.fields?.Attachments?.some(stored => stored.id === file.id && stored.filename === file.filename))) throw authError(400, 'Pièce jointe du modèle introuvable.');
        retainedBytes = retained.reduce((size,file)=>size + (original.fields.Attachments.find(stored=>stored.id===file.id).size || 0),0);
      }
      const files = await resolveAttachments(input.attachments.filter(file => !retained.includes(file)));
      if (retainedBytes + files.reduce((size,file)=>size + Buffer.from(file.content,'base64').length,0) > MAX_ATTACHMENT_BYTES) throw authError(400,'Les pièces jointes dépassent 2 Mo au total.');
      const fields = { Name: input.name, Subject: input.subject, Body: input.body, CC: input.cc, 'From Key': input.fromKey, Attachments: retained.map(file => ({ id: file.id })) };
      let saved = await request(table + (body.id ? `/${body.id}` : ''), body.id ? 'PATCH' : 'POST', fields);
      for (const file of files) {
        try {
          const uploaded = await fetch(`https://content.airtable.com/v0/${BASE_ID}/${saved.id}/${attachmentField}/uploadAttachment`, { method:'POST', headers:{ Authorization:`Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ filename:file.filename, contentType:'application/octet-stream', file:file.content }), signal:AbortSignal.timeout(20000) });
          if (!uploaded.ok) throw new Error('Upload failed');
        } catch { return res.status(503).json({ error:'Modèle enregistré, mais une pièce jointe n’a pas été confirmée. Rechargez avant de réessayer.', templateId:saved.id, partial:true }); }
      }
      if (files.length) try { saved = await request(`${table}/${saved.id}`); } catch { return res.status(503).json({ error:'Modèle enregistré, mais relecture non confirmée. Rechargez avant de réessayer.', templateId:saved.id, partial:true }); }
      return res.json({ template: normalizeMailTemplate(saved) });
    }
    if (body.action !== 'send') throw authError(400, 'Action inconnue.');
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(body.idempotencyKey || '')) throw authError(400, 'Identifiant d’envoi invalide.');
    if (!env.RESEND_API_KEY) throw authError(503, 'Envoi email non configuré.');
    const student = await getStudent(body.studentId);
    const attachments = await resolveAttachments(input.attachments);
    let message = { text: renderMailText(input.body, student) };
    if (systemTemplate) {
      try { const variables = validateOnboardingVariables(body.variables); const rendered = renderOnboarding({ student, variables, attachments }); message = { html:rendered.html,text:rendered.text }; } catch (error) { throw authError(400,error.message); }
      attachments.push({ filename:'jeexpert-logo.png',content:MAILING_LOGO_BASE64,content_id:'jeexpert-logo',content_type:'image/png' });
      if (attachments.reduce((sum,file)=>sum+Buffer.from(file.content,'base64').length,0)>MAX_ATTACHMENT_BYTES) throw authError(400,'Les pièces jointes et le logo dépassent 2 Mo au total.');
    }
    const subject = renderMailText(input.subject, student);
    if (/[\r\n]/.test(subject) || subject.length > 300) throw authError(400, 'Objet personnalisé invalide.');
    let response;
    try { response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `mailing-${user.id}-${body.idempotencyKey}` }, body: JSON.stringify({ from: sender.email, to: [student.email], cc: parseMailCc(input.cc), subject, ...message, attachments }), signal: AbortSignal.timeout(20000) }); } catch { throw authError(503, 'Envoi non confirmé. Réessayez sans modifier le message pour éviter un doublon.'); }
    const sent = await response.json();
    if (!response.ok) throw authError(response.status === 409 ? 409 : 400, sent.message || 'Envoi refusé par le fournisseur.');
    const result = { success: true, id: sent.id };
    try {
      const params = new URLSearchParams({ filterByFormula: `{Provider ID}='${String(sent.id).replace(/'/g, "\\'")}'`, maxRecords: '1' });
      const existing = await request(`${EMAIL_HISTORY_TABLE}?${params}`);
      if (!existing.records?.length) await request(EMAIL_HISTORY_TABLE, 'POST', { 'Provider ID': sent.id || '', Recipient: student.email, Subject: subject, 'Sent At': new Date().toISOString(), Actor: `${user.displayName || user.username} (${user.username})` });
    } catch { result.warning = 'Email envoyé, mais historique non enregistré. Ne renvoyez pas le message.'; }
    return res.json(result);
  } catch (error) { return sendAuthError(res, error); }
}
