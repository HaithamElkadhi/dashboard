import { MEETING_FIELDS, readPreparationMeeting, validatePreparationMeeting } from '../../src/lib/preparationMeeting.js';
import { DEPOSIT_FIELDS, readPreparationDeposit, validatePreparationDeposit } from '../../src/lib/preparationDeposit.js';
import { DV_FIELDS, readPreparationDv, validatePreparationDv } from '../../src/lib/preparationDv.js';
import { TEST_FIELDS, readPreparationTest, validatePreparationTest } from '../../src/lib/preparationTest.js';
import { authError } from './auth.js';

const statusFields = {
  'save-mousad9a': { field: 'fld2YHuug3Idlz1zb', key: 'mousad9aDone' },
  'save-translation': { field: 'fldc3wGaASfUESuQP', key: 'translationDone' },
};
const pending = new Map();
const result = record => ({ ...Object.fromEntries(Object.values(statusFields).map(({ key, field }) => [key, record.fields?.[field] === true])), test: readPreparationTest(record.fields), dv: readPreparationDv(record.fields), deposit: readPreparationDeposit(record.fields), meeting: readPreparationMeeting(record.fields) });

export async function preparation(req, res, { request, studentId }) {
  if (req.method === 'GET') return res.json(result(await request()));
  const body = req.body || {};
  const forms = {
    'save-meeting': { fields: MEETING_FIELDS, read: readPreparationMeeting, validate: validatePreparationMeeting },
    'save-test': { fields: TEST_FIELDS, read: readPreparationTest, validate: validatePreparationTest },
    'save-dv': { fields: DV_FIELDS, read: readPreparationDv, validate: validatePreparationDv },
    'save-deposit': { fields: DEPOSIT_FIELDS, read: readPreparationDeposit, validate: validatePreparationDeposit },
  };
  if (Object.hasOwn(forms, body.action)) {
    const definition = forms[body.action];
    if (Object.keys(body).some(key => !['action', 'studentId', 'input', 'expected'].includes(key))) throw authError(400, 'Requête invalide.');
    let input;
    try { input = definition.validate(body.input); } catch (error) { throw authError(400, error.message); }
    const expected = body.expected;
    if (!expected || Object.keys(definition.fields).some(key => typeof expected[key] !== typeof input[key])) throw authError(400, 'Actualisez avant d’enregistrer.');
    const same = (a, b) => Object.keys(definition.fields).every(key => a[key] === b[key]);
    const operation = (pending.get(studentId) || Promise.resolve()).catch(() => {}).then(async () => {
      const record = await request();
      const current = definition.read(record.fields);
      if (same(current, input)) return result(record);
      if (!same(current, expected)) throw authError(409, 'Ce suivi a changé. Actualisez avant de réessayer.');
      return result(await request('PATCH', Object.fromEntries(Object.entries(definition.fields).map(([key, field]) => [field, input[key]]))));
    });
    pending.set(studentId, operation);
    try { return res.json(await operation); }
    finally { if (pending.get(studentId) === operation) pending.delete(studentId); }
  }
  const status = statusFields[body.action];
  if (!status || Object.keys(body).some(key => !['action', 'studentId', 'done', 'expected'].includes(key)) ||
      typeof body.done !== 'boolean' || typeof body.expected !== 'boolean') {
    throw authError(400, 'Statut de préparation invalide.');
  }
  const operation = (pending.get(studentId) || Promise.resolve()).catch(() => {}).then(async () => {
    const current = result(await request());
    if (current[status.key] === body.done) return current;
    if (current[status.key] !== body.expected) throw authError(409, 'Ce statut a changé. Actualisez avant de réessayer.');
    return result(await request('PATCH', { [status.field]: body.done }));
  });
  pending.set(studentId, operation);
  try { return res.json(await operation); }
  finally { if (pending.get(studentId) === operation) pending.delete(studentId); }
}
