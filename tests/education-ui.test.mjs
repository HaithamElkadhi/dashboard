import test from 'node:test';
import assert from 'node:assert/strict';
import { educationEmailTemplate } from '../src/lib/educationUi.js';
const student = { fields: { 'Nom complet': 'Sara' } };
test('note email preserves zero, date, existing scale and copy instructions', () => {
  const result = educationEmailTemplate('note', student, { fields: { Note: 0, 'Barème': 10, Date: '2026-10-11', Commentaire: 'Revoir les fractions.', 'Copies d’examen': [{ id: 'attCopy' }] } });
  assert.match(result.subject, /Sara/);
  for (const text of ['0 / 10', '2026-10-11', 'Revoir les fractions.', 'copie est jointe']) assert.ok(result.body.includes(text));
});
test('discipline email uses the selected student and teacher observation', () => {
  const result = educationEmailTemplate('observation', student, { fields: { Catégorie: 'Discipline', Observation: 'Observation du maître', Auteur: 'Mme Test', Date: '2026-10-11' } });
  assert.match(result.subject, /Discipline — Sara/);
  for (const text of ['Observation du maître', 'Mme Test', '2026-10-11']) assert.ok(result.body.includes(text));
  assert.deepEqual(educationEmailTemplate('libre', student), { subject: '', body: '' });
});
