export const INTEGRATION_TABLE = 'tblYAnZhQQWOHmML5';
export const IF = { name: 'fldgZIkyZiUjTSYAF', student: 'fldBrn1b6icDGwGQI', studentId: 'fldE6JzlxYo8luGkc', step: 'fldGDuF9lsT2wgn4A', legacyStatus: 'fldte32uROpTlmt1q', status: 'fldFduxqxZ0tJ63dt', legacyHousingType: 'fld8aNjtuSurNhMw0', housingType: 'fldZxHTA6ZKDj5eDa', dueDate: 'fldTLcySC96qSX7kO', completedDate: 'fldPB1m88AdmUe7Il', notes: 'fld3zSDrgck72Zw0d', link: 'fldVkymcJj9SpYofh', updatedBy: 'fld9keuQ2MfWOyF33', updatedAt: 'fld4VdXyULEMYUqDI', history: 'fld6udhonigFRO6h6' };
export const HOUSING_TYPES = ['Searching', 'Student dorm', 'Rent Contract', 'Family House', 'Friend House', 'BnB'];
export const INTEGRATION_STEPS = [
  { name: 'Welcome package', title: 'Welcome package', statuses: ['Not sent', 'Sent'], fields: ['status', 'completedDate', 'notes'], dateLabel: 'Sent date', complete: 'Sent' },
  { name: 'Codice fiscale', title: 'Codice fiscale', statuses: ['Not started', 'Booked', 'Received'], fields: ['status', 'notes'], complete: 'Received' },
  { name: 'University enrollment', title: 'Immatricolazione', statuses: ['Not started', 'Done'], fields: ['status', 'notes'], complete: 'Done' },
  { name: 'Kit permesso', title: 'Kit permesso', statuses: ['Not prepared', 'Prepared'], fields: ['status', 'notes'], complete: 'Prepared' },
  { name: 'ISEE / ISEEU', title: 'ISEE / ISEEU', statuses: [], fields: ['notes'] },
  { name: 'Revolut assistance', title: 'Revolut', statuses: ['Not offered', 'Link sent', 'Completed'], fields: ['status', 'link', 'completedDate', 'notes'], dateLabel: 'Link sent date', complete: 'Completed' },
  { name: 'Housing', title: 'Housing', statuses: [], fields: ['housingType', 'notes'] },
];
export const INTEGRATION_INPUTS = ['status', 'completedDate', 'notes', 'link', 'housingType'];
export function normalizeIntegration(record, step) {
  const definition = INTEGRATION_STEPS.find(item => item.name === step);
  const fields = record?.fields || {};
  const legacyDone = fields[IF.legacyStatus] === 'Done';
  const status = fields[IF.status] || (legacyDone ? definition?.complete : '') || definition?.statuses[0] || '';
  return { id: record?.id || '', step, status, ...Object.fromEntries(['completedDate', 'notes', 'link', 'housingType', 'updatedBy', 'updatedAt', 'history'].map(key => [key, fields[IF[key]] || (key === 'housingType' ? fields[IF.legacyHousingType] : '') || ''])) };
}
export function integrationComplete(step, definition) {
  return definition.name === 'Housing' ? HOUSING_TYPES.slice(1).includes(step.housingType) : !!definition.complete && step.status === definition.complete;
}
export function integrationInput(step) {
  const definition = INTEGRATION_STEPS.find(item => item.name === step.step);
  return Object.fromEntries(definition.fields.map(key => [key, step[key] || '']));
}
export async function integrationApi(studentId, body) {
  const response = await fetch('/api/integration?studentId=' + encodeURIComponent(studentId), body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, ...body }) } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load student integration.');
  return data;
}
