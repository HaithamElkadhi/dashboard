export const TEST_TYPES = ['Cacher', 'IELTS ou équivalent', 'CISIA ou équivalent', 'EF Test'];
export const TEST_FIELDS = { type: 'fldJs1RQZowDj3XDT', done: 'flddPj5ksWs0wLcCF', note: 'fldy5VYn41gMTSeRC' };

export function readPreparationTest(fields = {}) {
  return { type: fields[TEST_FIELDS.type] || '', done: fields[TEST_FIELDS.done] === true, note: fields[TEST_FIELDS.note] || '' };
}

export function validatePreparationTest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['type', 'done', 'note'].includes(key)) ||
      !TEST_TYPES.includes(input.type) || typeof input.done !== 'boolean' ||
      typeof input.note !== 'string' || input.note.length > 2000) throw new Error('Choisissez un test, un statut et une note de 2 000 caractères maximum.');
  return { type: input.type, done: input.done, note: input.note.trim() };
}
