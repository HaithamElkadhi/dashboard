import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/preparation-list.js';
import { ACC, PF } from '../src/lib/config.js';
import { LINKED_ACCOUNTS_FIELD } from '../src/lib/preparationIdentity.js';
import { INTAKE_FIELD, schoolYears, matchesSchoolYear, preparationStats, isCandidate } from '../src/lib/preparationCohort.js';

test('school years group legacy spellings and keep missing years separate', () => {
  const fields = { [INTAKE_FIELD]: ['26 - 27 ', '2026/2027', '2027/2028'] };
  assert.deepEqual(schoolYears(fields), ['2026/2027', '2027/2028']);
  assert.equal(matchesSchoolYear(fields, '2026/2027'), true);
  assert.equal(matchesSchoolYear(fields, '2025/2026'), false);
  assert.equal(matchesSchoolYear({}, '__none__'), true);
  assert.equal(isCandidate({ [PF.situation]: ['Candidate', 'Student'] }), true);
  assert.equal(isCandidate({ [PF.situation]: ['Prospect'] }), false);
});

test('statistics use saved stage criteria and exclude hidden tests from their denominator', () => {
  const records = [
    { id: 'recFirst', fields: {
      [LINKED_ACCOUNTS_FIELD]: ['recWrongOwner', 'recWrongLabel', 'recApplication'],
      fldsMJ7gvO2Qz9UzT: JSON.stringify({ version: 1, profile: {}, documents: [{ id: 'passport', name: 'Passeport' }] }),
      fldmzKbBTH2hcZGiO: true, fld2YHuug3Idlz1zb: true, fldc3wGaASfUESuQP: true,
      fldJs1RQZowDj3XDT: 'Cacher', flddPj5ksWs0wLcCF: true,
      fldZMP2nd2ziXdLHp: 'Rendez-vous pris', fldVsPZX5T0OO0VhS: true,
    } },
    { id: 'recSecond', fields: {
      [PF.applicationEmail]: 'legacy@example.com', fldsMJ7gvO2Qz9UzT: '{bad',
      [LINKED_ACCOUNTS_FIELD]: ['recWrongLabel'],
      fldJs1RQZowDj3XDT: 'EF Test', flddPj5ksWs0wLcCF: true,
    } },
  ];
  const account = (owner, label) => ({ fields: {
    [ACC.prospectLink]: [owner], [ACC.label]: [label], [ACC.mailUser]: 'student@example.com',
  } });
  const accounts = new Map([
    ['recWrongOwner', account('recOther', 'Email Candidature')],
    ['recApplication', account('recFirst', 'Email Candidature')],
    ['recWrongLabel', account('recSecond', 'Universitaly')],
  ]);
  const stats = Object.fromEntries(preparationStats(records, accounts).map(stat => [stat.key, stat]));
  assert.equal(stats.identity.done, 1);
  assert.equal(stats.meeting.done, 1);
  assert.equal(stats.meeting.percent, 50);
  assert.equal(Object.keys(stats).length, 8);
  assert.equal(stats.documents.done, 1);
  assert.equal(stats.documents.unknown, 1);
  assert.equal(stats.mousad9a.percent, 50);
  assert.equal(stats.translation.done, 1);
  assert.equal(stats.test.hidden, 1);
  assert.equal(stats.test.total, 1);
  assert.equal(stats.test.percent, 100);
  assert.equal(stats.dv.done, 1);
  assert.equal(stats.deposit.done, 1);
  assert.ok(preparationStats([]).every(stat => stat.percent === 0));
});

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const response = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
function mockPages() {
  const queries = [];
  globalThis.fetch = async url => {
    if (String(url).includes('tblJ85bJE0loqwNvU')) return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
    if (String(url).endsWith('/recUser')) return { ok: true, json: async () => ({ id: 'recUser', fields: { username: 'viewer', is_active: true, role: 'View' } }) };
    const query = new URL(url).searchParams;
    queries.push(query);
    const fields = { [PF.situation]: ['Candidate'], [INTAKE_FIELD]: ['26 - 27 '], [PF.fullName]: 'Test', [PF.applicationEmail]: 'Not Created' };
    const records = query.get('offset') ? [{ id: 'recSecond', fields }] : [
      { id: 'recFirst', fields },
      { id: 'recOtherYear', fields: { ...fields, [INTAKE_FIELD]: ['2027/2028'] } },
      { id: 'recProspect', fields: { ...fields, [PF.situation]: ['Prospect'] } },
    ];
    return { ok: true, json: async () => ({ records, ...(query.get('offset') ? {} : { offset: 'page2' }) }) };
  };
  return queries;
}
const request = url => ({ method: 'GET', url, headers: { cookie: 'jeexpert_session=' + 'fa'.repeat(32) } });

test('candidate list is paginated, filtered by year and excludes other situations', async () => {
  const queries = mockPages(), res = response();
  await handler(request('/api/preparation-list?mode=list&year=2026%2F2027'), res, { AIRTABLE_API_KEY: 'test' });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.students.map(student => student.id), ['recFirst', 'recSecond']);
  assert.ok(res.body.stats.every(stat => stat.total === 2));
  assert.equal(queries.length, 2);
  assert.match(queries[0].get('filterByFormula'), /Candidate/);
  assert.match(queries[0].get('filterByFormula'), /REGEX_MATCH/);
  assert.equal(JSON.stringify(res.body).includes('applicationEmail'), false);
});

test('candidate year metadata contains counts without student details', async () => {
  mockPages(); const res = response();
  await handler(request('/api/preparation-list?mode=years'), res, { AIRTABLE_API_KEY: 'test' });
  assert.equal(res.code, 200);
  assert.equal(res.body.total, 3);
  assert.equal(res.body.years.find(year => year.value === '2026/2027').count, 2);
  assert.equal(res.body.students, undefined);
});
