export const DEPOSIT_FIELDS = { done: 'fldVsPZX5T0OO0VhS', note: 'fld0t9hHbtgI873j6' };
export function readPreparationDeposit(fields = {}) {
  return { done: fields[DEPOSIT_FIELDS.done] === true, note: fields[DEPOSIT_FIELDS.note] || '' };
}
export function validatePreparationDeposit(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['done', 'note'].includes(key)) ||
      typeof input.done !== 'boolean' || typeof input.note !== 'string' || input.note.length > 2000) {
    throw new Error('Choisissez un statut et une note de 2 000 caractères maximum.');
  }
  return { done: input.done, note: input.note.trim() };
}
