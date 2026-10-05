import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/student-contact.js';
import { PF } from '../src/lib/config.js';
const env = { AIRTABLE_API_KEY: 'test', NODE_ENV: 'production', APP_ORIGIN: 'https://dashboard.example' };
const original = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = original; });
const history = '01/01/2001 — Original comment\nLegacy note';
function request(body = {}, extra = {}) {
  return { method: 'POST', url: '/api/student-contact', headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'dd'.repeat(32) }, body: { recordId: 'recStudent', date: '2002-01-01', reason: 'New call', expectedHistory: history, ...body }, ...extra };
}
function response() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } }; }
function mock(currentHistory = history, currentDate = '2001-01-01') {
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    let body;
    if (String(url).includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recView'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (String(url).endsWith('/recView')) body = { id: 'recView', fields: { username: 'viewer', is_active: true, role: 'View' } };
    else if (init.method === 'PATCH') { const payload = JSON.parse(init.body); writes.push(payload); body = { id: 'recStudent', fields: payload.fields }; }
    else body = { id: 'recStudent', fields: { [PF.contactHistory]: currentHistory, [PF.lastContact]: currentDate } };
    return { ok: true, json: async () => body };
  };
  return writes;
}

test('View can append contact, preserving original lines and writing only contact fields', async () => {
  const writes = mock(); const res = response();
  await handler(request({ reason: 'Call\nFollow-up' }), res, env);
  assert.equal(res.code, 200);
  assert.equal(res.body.contactHistory, '01/01/2002 — Call Follow-up\n' + history);
  assert.equal(res.body.lastContact, '2002-01-01');
  assert.deepEqual(Object.keys(writes[0].fields).sort(), [PF.contactHistory, PF.lastContact].sort());
});

test('an older contact does not move the latest contact date backwards', async () => {
  mock(history, '2003-01-01'); const res = response();
  await handler(request(), res, env);
  assert.equal(res.code, 200); assert.equal(res.body.lastContact, '2003-01-01');
});

test('View cannot overwrite history, update other fields or submit malformed contacts', async () => {
  const writes = mock();
  for (const body of [{ fields: { name: 'Changed' } }, { contactHistory: 'Replace' }, { date: '2002-02-31' }, { date: '9999-01-01' }, { reason: ' ' }, { recordId: '../users' }]) {
    const res = response(); await handler(request(body), res, env); assert.equal(res.code, 400);
  }
  assert.equal(writes.length, 0);
});

test('stale contact history is refused without erasing another contact', async () => {
  const writes = mock(history + '\nAnother contact'); const res = response();
  await handler(request(), res, env);
  assert.equal(res.code, 409); assert.equal(writes.length, 0);
});

test('contact exception still requires authentication, trusted origin and POST', async () => {
  const writes = mock();
  for (const [extra, code] of [[{ headers: { host: 'dashboard.example', origin: 'https://dashboard.example' } }, 401], [{ headers: { ...request().headers, origin: 'https://evil.example' } }, 403], [{ method: 'DELETE' }, 405]]) {
    const res = response(); await handler(request({}, extra), res, env); assert.equal(res.code, code);
  }
  assert.equal(writes.length, 0);
});
