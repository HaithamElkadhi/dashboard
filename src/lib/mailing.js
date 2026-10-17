export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const isMailEmail = value => typeof value === 'string' && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
export function parseMailCc(value = '') {
  if (typeof value !== 'string' || value.length > 2000) throw new Error('CC invalide.');
  const emails = [...new Set(value.split(/[\s,;]+/).filter(Boolean))];
  if (emails.length > 20 || emails.some(email => !isMailEmail(email))) throw new Error('Vérifiez les adresses CC (20 maximum).');
  return emails;
}
export function validateMailInput(input, { template = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Email invalide.');
  for (const key of ['subject', 'body', 'cc', 'fromKey']) if (typeof input[key] !== 'string') throw new Error('Champs email invalides.');
  if (!input.subject.trim() || input.subject.length > 300 || /[\r\n]/.test(input.subject)) throw new Error('Objet requis (300 caractères maximum).');
  if (!input.body.trim() || input.body.length > 30000) throw new Error('Message requis (30 000 caractères maximum).');
  if (!['default', 'contact', 'ecole'].includes(input.fromKey)) throw new Error('Expéditeur invalide.');
  parseMailCc(input.cc);
  if (template && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 150)) throw new Error('Nom du modèle requis (150 caractères maximum).');
  const attachments = input.attachments ?? [];
  if (!Array.isArray(attachments) || attachments.length > 10) throw new Error('10 pièces jointes maximum.');
  let size = 0;
  for (const file of attachments) {
    if (file?.id) {
      if (!/^att[A-Za-z0-9]+$/.test(file.id) || !/^rec[A-Za-z0-9]+$/.test(file.templateId || '') || typeof file.filename !== 'string') throw new Error('Référence de pièce jointe invalide.');
      continue;
    }
    if (!file || typeof file.filename !== 'string' || !file.filename.trim() || file.filename.length > 200 || /[\r\n/\\]/.test(file.filename) || typeof file.content !== 'string' || !file.content || file.content.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content)) throw new Error('Pièce jointe invalide.');
    size += file.content.length * 3 / 4 - (file.content.endsWith('==') ? 2 : file.content.endsWith('=') ? 1 : 0);
  }
  if (size > MAX_ATTACHMENT_BYTES) throw new Error('Les pièces jointes dépassent 2 Mo au total.');
  return { ...(template ? { name: input.name.trim() } : {}), subject: input.subject.trim(), body: input.body, cc: parseMailCc(input.cc).join(', '), fromKey: input.fromKey, attachments: attachments.map(file => file.id ? { id: file.id, filename: file.filename, templateId: file.templateId } : { filename: file.filename.trim(), content: file.content }) };
}
export function renderMailText(text, student) {
  const values = { fullName: student.fullName || '', firstName: student.firstName || student.fullName?.split(/\s+/)[0] || '', email: student.email || '' };
  return String(text).replace(/\{\{\s*(fullName|firstName|email)\s*\}\}/g, (_, key) => values[key]);
}
export function normalizeMailTemplate(record) {
  const fields = record.fields || {};
  const attachments = Array.isArray(fields.Attachments) ? fields.Attachments.map(file => ({ id: file.id, filename: file.filename, size: file.size || 0, templateId: record.id })) : [];
  return { id: record.id, name: fields.Name || '', subject: fields.Subject || '', body: fields.Body || '', cc: fields.CC || '', fromKey: fields['From Key'] || 'default', attachments };
}
