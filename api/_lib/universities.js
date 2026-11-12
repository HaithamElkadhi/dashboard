import { BASE_ID } from '../../src/lib/config.js';
import { authError, requireUser, sendAuthError } from './auth.js';

const UNIVERSITIES_TABLE = 'tblIFAWo1BkhmssDO';
const SESSIONS_TABLE = 'tblhzlQZzb3zRqVHk';
const universityFields = {
  name: 'fldl5u5qmzaNbg3pi',
  source: 'fldpifVxNZ3aH2qG1',
  sessionIds: 'fldVVobFmXVT94ByV',
};
const sessionFields = {
  title: 'fldMwJWPiPlrjRPo0',
  year: 'fldvRHwI2qPhxPMGS',
  opening: 'fld3zaIH27AgnAgC9',
  deadline: 'fldAHWw4DrrZNHPyf',
  fees: 'fldlExjwBsI6Hz859',
  language: 'fldkvOlt5pgeOE9eh',
  average: 'fldqqZjxotKiV5DN9',
  method: 'fldKKkE88qBGfrkiq',
  notes: 'fldH9tOPAcuHrZtPu',
  links: 'fldV9rYM4cLnbdDdF',
  checkedAt: 'fldQTsuABENQw7hp5',
  history: 'fldNmal4d83cU1kLi',
};

async function listRecords(table, fields, token, filter) {
  const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
  for (const id of Object.values(fields)) params.append('fields[]', id);
  if (filter) params.set('filterByFormula', filter);
  const records = [];
  do {
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw authError(503, 'Le répertoire Airtable est indisponible. Réessayez.');
    const page = await response.json();
    records.push(...page.records.map(record => ({
      id: record.id,
      ...Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, record.fields[id]])),
    })));
    if (!page.offset) return records;
    params.set('offset', page.offset);
  } while (true);
}

export async function loadUniversities(token) {
  if (!token) throw authError(503, 'La connexion au répertoire Airtable doit être configurée.');
  const universities = await listRecords(UNIVERSITIES_TABLE, universityFields, token);
  const ids = [...new Set(universities.flatMap(university => university.sessionIds ?? []))]
    .filter(id => /^rec[A-Za-z0-9]{14}$/.test(id));
  const sessions = new Map();
  // Query only the linked admissions, in bounded batches. Hussein DB also contains formations.
  for (let start = 0; start < ids.length; start += 40) {
    const match = ids.slice(start, start + 40).map(id => `RECORD_ID()='${id}'`);
    const records = await listRecords(SESSIONS_TABLE, sessionFields, token, `OR(${match.join(',')})`);
    for (const record of records) sessions.set(record.id, record);
  }
  return universities.map(({ sessionIds = [], ...university }) => ({
    ...university,
    sessions: sessionIds.map(id => sessions.get(id) ?? { id, missing: true }),
  }));
}

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée.' });
  try {
    await requireUser(req, env);
    return res.json({ universities: await loadUniversities(env.AIRTABLE_API_KEY) });
  } catch (error) {
    return sendAuthError(res, error);
  }
}
