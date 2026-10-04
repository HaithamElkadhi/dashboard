export const DOCUMENT_TABLES = { Academic: 'tbl4qg0oCDDMm6nfc', Scholarship: 'tbl7qGYTAKarKrGNn', reviews: 'tblBEikU5IsBAwzZL', activity: 'tblRmPz47Tclxz3od' };
export const REVIEW_STATUSES = ['Missing', 'Received', 'Under review', 'Validated', 'Needs correction'];
export const REQUIREMENTS = ['Required', 'Optional', 'Not applicable'];
export const SOURCE_FIELDS = {
  Academic: { Documents: 'Academic documents' },
  Scholarship: { 'Actes de naissance': 'Birth certificates', 'Livret de famille / Vie collective': 'Family booklet', 'Documents propriété': 'Property documents', 'Documents non-propriété': 'Non-ownership documents', 'Attestation solde 31-12-2025': 'Bank balance certificate — 31 Dec 2025', 'Déclarations fiscales': 'Tax declarations', 'Autres documents': 'Other documents' },
};
export const FOLDER_STATUSES = { Academic: ['Pending', 'Under Review', 'Incomplete', 'Complete'], Scholarship: ['Reçu', 'En vérification', 'Incomplet', 'Validé'] };
export const FOLDER_STATUS_LABELS = { Reçu: 'Received', 'En vérification': 'Under review', Incomplet: 'Incomplete', Validé: 'Validated' };
export function buildDocumentItems(folders, reviews) {
  const rows = reviews.map(r => ({ id: r.id, ...r.fields }));
  const items = [];
  for (const folder of folders) for (const [field, category] of Object.entries(SOURCE_FIELDS[folder.source])) {
    for (const file of folder.fields[field] || []) {
      const key = `${folder.source}:${folder.id}:${field}:${file.id}`;
      const review = rows.find(r => r['Document Key'] === key);
      items.push(documentItem(key, folder.source, file.filename || category, [file], review, { sourceRecordId: folder.id, sourceField: field, attachmentId: file.id, category }));
    }
  }
  for (const review of rows) if (!items.some(item => item.key === review['Document Key'])) {
    items.push(documentItem(review['Document Key'], review.Source, review['Document Name'], [], review, { category: review['Source Field'] || 'Requested document', detached: Boolean(review['Attachment ID']) }));
  }
  return items;
}
function documentItem(key, source, name, originals, review, metadata) {
  return { key, source, name: review?.['Document Name'] || name, files: [...(review?.Versions || [])].reverse().concat(originals), reviewId: review?.id || '', status: review?.['Review Status'] || (originals.length ? 'Received' : 'Missing'), requirement: review?.Requirement || 'Required', note: review?.['Internal Note'] || '', reason: review?.['Correction Reason'] || '', assignedTo: review?.['Assigned User ID'] || '', assignedToName: review?.['Assigned User Name'] || '', due: review?.['Due Date'] || '', updatedAt: review?.['Updated At'] || '', ...metadata };
}
export function emailTemplate(kind, student, documents, deadline = '') {
  const name = student.name || 'student';
  const list = documents.map(doc => `• ${doc.name}${kind === 'correction' && doc.reason ? ': ' + doc.reason : ''}`).join('\n');
  const templates = {
    received: ['Documents received', `Hello ${name},\n\nWe confirm receipt of the following documents. They will now be reviewed:\n${list}\n\nWe will contact you if further information is needed.`],
    validated: ['Documents validated', `Hello ${name},\n\nThe following documents have been reviewed and validated:\n${list}`],
    missing: ['Additional documents required', `Hello ${name},\n\nPlease send the following documents to complete your file:\n${list}${deadline ? '\n\nPlease send them by ' + deadline + '.' : ''}\n\nYou can reply to this email with your documents.`],
    correction: ['Document corrections required', `Hello ${name},\n\nPlease provide a corrected version of the following documents:\n${list}${deadline ? '\n\nPlease send them by ' + deadline + '.' : ''}`],
  };
  const [subject, body] = templates[kind] || templates.missing;
  return { subject, message: body + '\n\nBest regards,\nJEEXPERT team' };
}
export async function documentsApi(studentId, payload) {
  const response = await fetch('/api/student-documents?studentId=' + encodeURIComponent(studentId), payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to manage student documents.');
  return data;
}
export async function documentUsers() {
  const response = await fetch('/api/ticketing?users=1');
  if (!response.ok) throw new Error('Cannot load platform users.');
  const { users = [] } = await response.json();
  return { assignedTo: users.map(user => user.id), assigneeLabels: Object.fromEntries(users.map(user => [user.id, `${user.displayName} (${user.username})`])) };
}
