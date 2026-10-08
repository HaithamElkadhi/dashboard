import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/integration.js';
import { IF as F, INTEGRATION_TABLE, normalizeIntegration, INTEGRATION_STEPS, integrationComplete } from '../src/lib/integration.js';
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const input = { status: 'Sent', completedDate: '', notes: 'Package sent' };
const record = { id: 'recStep', fields: { [F.student]: ['recStudent'], [F.studentId]: 'recStudent', [F.step]: 'Welcome package', [F.status]: 'Sent', [F.history]: 'Previous event' } };
function req(body = {}, method = 'POST') { return { method, url: '/api/integration?studentId=recStudent', headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'fb'.repeat(32) }, body: { studentId: 'recStudent', step: 'Welcome package', input, expected: normalizeIntegration(null, 'Welcome package'), ...body } }; }
function res() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } }; }
function mock({ role = 'Editor', records = [], fail = false } = {}) {
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url); let body;
    if (path.includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (path.endsWith('/recUser')) body = { id: 'recUser', fields: { username: 'operator', is_active: true, role } };
    else if (['POST', 'PATCH'].includes(init.method)) {
      assert.ok(path.includes(INTEGRATION_TABLE)); const payload = JSON.parse(init.body); writes.push({ method: init.method, ...payload });
      if (fail) return { ok: false, status: 503 };
      body = { id: 'recStep', fields: { ...(init.method === 'PATCH' ? record.fields : {}), ...payload.fields } };
    }
    else if (path.includes('/recStudent?')) { assert.equal(new URL(path).searchParams.has('fields[]'), false); body = { id: 'recStudent', fields: {} }; }
    else { assert.match(new URL(path).searchParams.get('filterByFormula'), /recStudent/); body = { records }; }
    return { ok: true, json: async () => body };
  };
  return writes;
}
test('GET shows every step without creating records; View cannot write', async () => {
  const writes = mock({ role: 'View' }); let response = res(); await handler(req({}, 'GET'), response, env);
  assert.equal(response.code, 200); assert.equal(response.body.steps.length, 7); assert.equal(response.body.steps[0].status, 'Not sent');
  response = res(); await handler(req(), response, env); assert.equal(response.code, 403); assert.equal(writes.length, 0);
});
test('new step links student and automatically stamps actor, date and history', async () => {
  const writes = mock(); const response = res(); await handler(req(), response, env);
  assert.equal(response.code, 200); assert.equal(writes[0].method, 'POST'); assert.deepEqual(writes[0].fields[F.student], ['recStudent']);
  assert.match(response.body.step.completedDate, /^\d{4}-\d{2}-\d{2}$/); assert.match(response.body.step.updatedBy, /operator/);
  assert.match(response.body.step.history, /Not sent → Sent/);
});
test('editing appends history and reopening clears completion without reassigning student', async () => {
  const writes = mock({ records: [record] }); const response = res();
  await handler(req({ expected: normalizeIntegration(record, 'Welcome package'), input: { ...input, status: 'Not sent', completedDate: '2000-01-01' } }), response, env);
  assert.equal(response.code, 200); assert.equal(writes[0].method, 'PATCH'); assert.equal(writes[0].fields[F.completedDate], null);
  assert.equal(F.student in writes[0].fields, false); assert.match(response.body.step.history, /^Previous event\n/);
});
test('invalid dates, links, statuses and forged audit fields are rejected', async () => {
  const writes = mock();
  for (const extra of [{ dueDate: '2026-02-31' }, { completedDate: '9999-01-01' }, { status: 'invalid' }, { link: 'javascript:alert(1)' }, { updatedBy: 'forged' }]) {
    const response = res(); await handler(req({ input: { ...input, ...extra } }), response, env); assert.equal(response.code, 400);
  }
  assert.equal(writes.length, 0);
});
test('stale, foreign-linked and duplicate steps cannot be overwritten', async () => {
  for (const records of [[record], [{ ...record, fields: { ...record.fields, [F.student]: ['recOther'] } }], [record, { ...record, id: 'recDuplicate' }]]) {
    const writes = mock({ records }); const response = res(); await handler(req(), response, env); assert.equal(response.code, 409); assert.equal(writes.length, 0);
  }
});
test('uncertain save is not retried; anonymous requests remain denied', async () => {
  const writes = mock({ fail: true }); let response = res(); await handler(req(), response, env); assert.equal(response.code, 503); assert.equal(writes.length, 1);
  const request = req(); request.headers.cookie = ''; response = res(); await handler(request, response, env); assert.equal(response.code, 401);
});
test('each workflow accepts only its own fields and statuses', async () => {
  const writes = mock();
  for (const [step, input] of [
    ['Codice fiscale', { status: 'Booked', notes: 'Appointment booked' }],
    ['University enrollment', { status: 'Done', notes: 'Enrolled' }],
    ['Kit permesso', { status: 'Prepared', notes: 'Kit ready' }],
    ['ISEE / ISEEU', { notes: 'CAF follow-up' }],
    ['Housing', { housingType: 'Student dorm', notes: 'Room reserved' }],
    ['Revolut assistance', { status: 'Link sent', link: 'https://example.com/referral', completedDate: '', notes: 'Sent' }],
  ]) {
    const response = res(); await handler(req({ step, input, expected: normalizeIntegration(null, step) }), response, env); assert.equal(response.code, 200);
    if (step === 'ISEE / ISEEU') { assert.equal(F.status in writes.at(-1).fields, false); assert.equal(F.link in writes.at(-1).fields, false); }
    if (step === 'Housing') assert.equal(writes.at(-1).fields[F.housingType], 'Student dorm');
  }
});
test('unrelated links, removed steps and generic statuses cannot be submitted', async () => {
  const writes = mock();
  for (const [step, input] of [
    ['Codice fiscale', { status: 'Received', link: 'https://example.com' }],
    ['Kit permesso', { status: 'Done' }],
    ['ISEE / ISEEU', { status: 'Done', notes: 'comment' }],
    ['Housing', { housingType: 'Hotel' }],
    ['Revolut assistance', { status: 'Assistance needed' }],
    ['Health insurance', { notes: 'removed' }],
  ]) { const response = res(); await handler(req({ step, input, expected: normalizeIntegration(null, step) }), response, env); assert.equal(response.code, 400); }
  assert.equal(writes.length, 0);
});
test('Housing Searching saves without a completed mark; known housing types are complete', async () => {
  const writes = mock(); const response = res();
  await handler(req({ step: 'Housing', input: { housingType: 'Searching', notes: 'Looking for a room' }, expected: normalizeIntegration(null, 'Housing') }), response, env);
  assert.equal(response.code, 200); assert.equal(writes[0].fields[F.housingType], 'Searching');
  const definition = INTEGRATION_STEPS.find(step => step.name === 'Housing');
  assert.equal(integrationComplete(response.body.step, definition), false);
  assert.equal(integrationComplete({ housingType: 'Rent Contract' }, definition), true);
  assert.equal(normalizeIntegration({ fields: { [F.legacyHousingType]: 'Student dorm' } }, 'Housing').housingType, 'Student dorm');
});
