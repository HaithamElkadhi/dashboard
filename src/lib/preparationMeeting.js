export const MEETING_FIELDS = { done: 'fldmzKbBTH2hcZGiO', note: 'fldxTej8hHvwewEPd' };
export function readPreparationMeeting(fields = {}) {
  return { done: fields[MEETING_FIELDS.done] === true, note: fields[MEETING_FIELDS.note] || '' };
}
export function validatePreparationMeeting(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['done', 'note'].includes(key)) ||
      typeof input.done !== 'boolean' || typeof input.note !== 'string' || input.note.length > 2000) {
    throw new Error('Choisissez un statut et une note de 2 000 caractères maximum.');
  }
  return { done: input.done, note: input.note.trim() };
}
