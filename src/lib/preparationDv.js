export const DV_STATUSES = ['Non fait', 'Rendez-vous pris', 'Fait'];
export const DV_FIELDS = { status: 'fldZMP2nd2ziXdLHp', note: 'fldf4cSkiS8DHMTY3' };
export function readPreparationDv(fields = {}) {
  return { status: fields[DV_FIELDS.status] || 'Non fait', note: fields[DV_FIELDS.note] || '' };
}
export function validatePreparationDv(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['status', 'note'].includes(key)) ||
      !DV_STATUSES.includes(input.status) || typeof input.note !== 'string' || input.note.length > 2000) {
    throw new Error('Choisissez un statut et une note de 2 000 caractères maximum.');
  }
  return { status: input.status, note: input.note.trim() };
}
