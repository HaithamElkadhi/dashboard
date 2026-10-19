import { ONBOARDING_DEFAULT_ATTACHMENTS } from './mailingAttachments.js';

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const MAX_ATTACHMENT_COUNT = 20;
export const isMailEmail = value => typeof value === 'string' && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
export function parseMailCc(value = '') {
  if (typeof value !== 'string' || value.length > 2000) throw new Error('CC invalide.');
  const emails = [...new Set(value.split(/[\s,;]+/).filter(Boolean))];
  if (emails.length > 20 || emails.some(email => !isMailEmail(email))) throw new Error('Vérifiez les adresses CC (20 maximum).');
  return emails;
}
export function validateMailInput(input, { template = false, system = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Email invalide.');
  for (const key of ['subject', 'body', 'cc', 'fromKey']) if (typeof input[key] !== 'string') throw new Error('Champs email invalides.');
  if (!input.subject.trim() || input.subject.length > 300 || /[\r\n]/.test(input.subject)) throw new Error('Objet requis (300 caractères maximum).');
  if (!input.body.trim() || input.body.length > 30000) throw new Error('Message requis (30 000 caractères maximum).');
  if (!['default', 'contact', 'ecole'].includes(input.fromKey)) throw new Error('Expéditeur invalide.');
  parseMailCc(input.cc);
  if (template && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 150)) throw new Error('Nom du modèle requis (150 caractères maximum).');
  const attachments = input.attachments ?? [];
  if (!Array.isArray(attachments) || attachments.length > MAX_ATTACHMENT_COUNT) throw new Error(`${MAX_ATTACHMENT_COUNT} pièces jointes maximum.`);
  let size = 0;
  const systemFiles = new Set();
  const studentDocuments = new Set();
  for (const file of attachments) {
    if (file?.studentDocument) {
      if (!system || template || !['proposal','invoice'].includes(file.studentDocument) || !/^rec[A-Za-z0-9]+$/.test(file.studentId || '') || typeof file.filename!=='string' || !file.filename.trim() || file.filename.length>200 || /[\r\n/\\]/.test(file.filename) || file.content || file.id || file.systemFile || file.studentDocument==='invoice' && (!/^rec[A-Za-z0-9]+$/.test(file.paymentId || '') || file.invoiceAttachmentId && !/^att[A-Za-z0-9]+$/.test(file.invoiceAttachmentId))) throw new Error('Document étudiant invalide.');
      const key=`${file.studentDocument}:${file.studentId}:${file.paymentId || ''}:${file.invoiceAttachmentId || ''}`;
      if(studentDocuments.has(key))throw new Error('Document étudiant sélectionné plusieurs fois.');
      studentDocuments.add(key);
      continue;
    }
    if (file?.systemFile) {
      const stored = ONBOARDING_DEFAULT_ATTACHMENTS.find(item => item.systemFile === file.systemFile);
      if (!system || template || !stored || stored.filename !== file.filename || file.content || file.id || systemFiles.has(file.systemFile)) throw new Error('Pièce jointe système invalide.');
      systemFiles.add(file.systemFile);
      continue;
    }
    if (file?.id) {
      if (!/^att[A-Za-z0-9]+$/.test(file.id) || !/^rec[A-Za-z0-9]+$/.test(file.templateId || '') || typeof file.filename !== 'string') throw new Error('Référence de pièce jointe invalide.');
      continue;
    }
    if (!file || typeof file.filename !== 'string' || !file.filename.trim() || file.filename.length > 200 || /[\r\n/\\]/.test(file.filename) || typeof file.content !== 'string' || !file.content || file.content.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content)) throw new Error('Pièce jointe invalide.');
    size += file.content.length * 3 / 4 - (file.content.endsWith('==') ? 2 : file.content.endsWith('=') ? 1 : 0);
  }
  if (size > MAX_ATTACHMENT_BYTES) throw new Error('Les pièces jointes dépassent 3 Mo au total.');
  return { ...(template ? { name: input.name.trim() } : {}), subject: input.subject.trim(), body: input.body, cc: parseMailCc(input.cc).join(', '), fromKey: input.fromKey, attachments: attachments.map(file => file.studentDocument ? {studentDocument:file.studentDocument,studentId:file.studentId,filename:file.filename,...(file.studentDocument==='invoice'?{paymentId:file.paymentId,...(file.invoiceAttachmentId?{invoiceAttachmentId:file.invoiceAttachmentId}:{})}:{})} : file.systemFile ? { ...ONBOARDING_DEFAULT_ATTACHMENTS.find(item => item.systemFile === file.systemFile) } : file.id ? { id: file.id, filename: file.filename, templateId: file.templateId } : { filename: file.filename.trim(), content: file.content }) };
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
