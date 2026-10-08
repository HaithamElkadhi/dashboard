import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/applications.js';
import { APPLICATION_FIELDS as F, APPLICATION_LINK, normalizeApplication } from '../src/lib/applications.js';
const original = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = original; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const input = { university: 'University', course: 'Engineering', language: 'EN', degree: 'Laurea Triennale', status: 'Submitted', candidacyDate: '2026-10-06' };
const existing = { id: 'recApplication', fields: { [F.student]: ['recStudent'], ...Object.fromEntries(Object.entries(input).map(([key, value]) => [F[key], value])) } };
function req(body = {}, method = 'POST') { return { method, url: '/api/applications?studentId=recStudent', headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'ee'.repeat(32) }, body: { studentId: 'recStudent', input, ...body } }; }
function res() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } }; }
function mock({ role = 'Editor', records = [], fail = false } = {}) {
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url); let body;
    if (path.includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (path.endsWith('/recUser')) body = { id: 'recUser', fields: { username: 'operator', display_name: 'Operator', is_active: true, role } };
    else if (path.includes('meta/bases')) body = { tables: [{ id: 'tblGP4mMaQs1XeVME', fields: [ { id: F.submittedBy }, ...Object.entries({ language: ['IT', 'EN', 'INGEGNERIA MECCANICA'], status: ['Proposal', 'Submitted', 'Admitted', 'Rejected', 'wrong@example.com'], degree: ['Laurea Triennale'] }).map(([key, names]) => ({ id: F[key], options: { choices: names.map(name => ({ name })) } })) ] }] };
    else if (['POST', 'PATCH'].includes(init.method)) { writes.push(JSON.parse(init.body)); body = { id: init.method === 'PATCH' ? 'recApplication' : 'recCreated', fields: { ...(init.method === 'PATCH' ? existing.fields : {}), ...writes.at(-1).fields } }; if (fail) return { ok: false, status: 503 }; }
    else if (path.includes('/recStudent?')) {
      assert.equal(new URL(path).searchParams.has('fields[]'), false, 'Single-record requests must not include fields[]');
      body = { id: 'recStudent', fields: { [APPLICATION_LINK]: records.map(record => record.id) } };
    }
    else body = { records };
    return { ok: true, json: async () => body };
  };
  return writes;
}
test('View reads valid choices and only applications linked to selected prospect', async () => {
  mock({ role: 'View', records: [existing, { id: 'recOther', fields: { [F.student]: ['recOtherStudent'] } }] });
  const response = res(); await handler(req({}, 'GET'), response, env);
  assert.equal(response.code, 200); assert.deepEqual(response.body.choices.language, ['IT', 'EN']);
  assert.equal(response.body.choices.status.length, 4); assert.equal(response.body.applications.length, 1);
});
test('View and anonymous callers cannot create applications', async () => {
  const writes = mock({ role: 'View' }); let response = res(); await handler(req(), response, env); assert.equal(response.code, 403);
  const request = req(); request.headers.cookie = ''; response = res(); await handler(request, response, env); assert.equal(response.code, 401); assert.equal(writes.length, 0);
});
test('creation links prospect and stamps authenticated author without updating prospect', async () => {
  const writes = mock(); const response = res(); await handler(req(), response, env);
  assert.equal(response.code, 201); assert.equal(writes.length, 1); assert.deepEqual(writes[0].fields[F.student], ['recStudent']);
  assert.match(writes[0].fields[F.submittedBy], /operator/); assert.equal(response.body.application.id, 'recCreated');
});
test('forged authors, malformed dates and invalid choices are rejected', async () => {
  const writes = mock();
  for (const extra of [{ submittedBy: 'fake' }, { candidacyDate: '2026-02-31' }, { language: 'invalid' }, { answerDate: '2000-01-01' }, { portalUrl: 'javascript:alert(1)' }]) {
    const response = res(); await handler(req({ input: { ...input, ...extra } }), response, env); assert.equal(response.code, 400);
  }
  assert.equal(writes.length, 0);
});
test('duplicate requires explicit confirmation', async () => {
  const writes = mock({ records: [existing] }); let response = res(); await handler(req(), response, env); assert.equal(response.code, 409); assert.equal(writes.length, 0);
  response = res(); await handler(req({ confirmDuplicate: true }), response, env); assert.equal(response.code, 201); assert.equal(writes.length, 1);
});
test('uncertain submission is not automatically retried', async () => {
  const writes = mock({ fail: true }); const response = res(); await handler(req(), response, env);
  assert.equal(response.code, 503); assert.match(response.body.error, /Refresh existing applications/); assert.equal(writes.length, 1);
});
test('editing updates existing record, clears optional values and preserves author and student', async () => {
  const writes = mock({ records: [existing] }); const response = res();
  await handler(req({ applicationId: existing.id, expected: normalizeApplication(existing), input: { ...input, city: 'Rome', comment: '' } }, 'PATCH'), response, env);
  assert.equal(response.code, 200); assert.equal(writes.length, 1);
  assert.equal(writes[0].fields[F.city], 'Rome'); assert.equal(writes[0].fields[F.comment], null);
  assert.equal(F.student in writes[0].fields, false); assert.equal(F.submittedBy in writes[0].fields, false);
});
test('editing rejects foreign records, stale snapshots and View mutations', async () => {
  let writes = mock({ records: [existing] });
  for (const [body, code] of [[{ applicationId: 'recForeign', expected: normalizeApplication(existing) }, 404], [{ applicationId: existing.id, expected: { ...normalizeApplication(existing), comment: 'stale' } }, 409]]) {
    const response = res(); await handler(req(body, 'PATCH'), response, env); assert.equal(response.code, code);
  }
  assert.equal(writes.length, 0); writes = mock({ role: 'View' }); const response = res();
  await handler(req({ applicationId: existing.id, expected: normalizeApplication(existing) }, 'PATCH'), response, env);
  assert.equal(response.code, 403); assert.equal(writes.length, 0);
});
