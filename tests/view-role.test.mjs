import test from 'node:test';
import assert from 'node:assert/strict';
import { publicUser, requireUser, assertCanWrite } from '../api/_lib/auth.js';
import proxy from '../api/proxy.js';
import ticketing from '../api/ticketing.js';
import documents from '../api/student-documents.js';
import email from '../api/send-email.js';
import users from '../api/admin/users.js';

const env = { AIRTABLE_API_KEY: 'test', NODE_ENV: 'production', APP_ORIGIN: 'https://dashboard.example' };
const original = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = original; });
function req(method, url, body = {}) {
  return { method, url, body, headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'cc'.repeat(32) } };
}
function res() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, send(body) { this.body = body; } }; }
function mock(role = 'View') {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    assert.equal(init.method || 'GET', 'GET', 'A View request must never write upstream');
    if (String(url).endsWith('/recViewer')) return { ok: true, json: async () => ({ id: 'recViewer', fields: { username: 'viewer', is_active: true, is_admin: true, role } }) };
    return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recViewer'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
  };
  return calls;
}

test('explicit View overrides the legacy admin checkbox; legacy accounts retain access', () => {
  const user = publicUser({ id: 'recViewer', fields: { role: 'View', is_admin: true } });
  assert.equal(user.isAdmin, false); assert.equal(user.canWrite, false);
  assert.throws(() => assertCanWrite(user), { status: 403 });
  assert.equal(publicUser({ fields: { is_admin: true } }).role, 'Admin');
  assert.equal(publicUser({ fields: {} }).role, 'Editor');
  assert.equal(publicUser({ fields: { role: 'Unexpected' } }).canWrite, false);
});

test('View sessions can read and log out; mutations are refused even with forged role', async () => {
  mock();
  assert.equal((await requireUser(req('GET', '/api/auth/me'), env)).user.role, 'View');
  assert.equal((await requireUser(req('POST', '/api/auth/logout'), env)).user.role, 'View');
  await assert.rejects(requireUser(req('POST', '/api/proxy', { role: 'Admin' }), env), { status: 403 });
});

test('all business mutation routes reject View before any business read, audit, email or write', async () => {
  for (const [handler, method, url, body] of [
    [proxy, 'POST', '/api/proxy?__p=appkqvTuc8F0AhWPp/tblQPh56AAmCe1bTj'],
    [proxy, 'PATCH', '/api/proxy'], [proxy, 'DELETE', '/api/proxy'],
    [proxy, 'POST', '/api/proxy?__host=content'],
    [ticketing, 'POST', '/api/ticketing'], [ticketing, 'PATCH', '/api/ticketing'], [ticketing, 'DELETE', '/api/ticketing'],
    ...['review', 'request', 'folder', 'upload', 'email'].map(action => [documents, 'POST', '/api/student-documents?studentId=recStudent', { action }]),
    [email, 'POST', '/api/send-email'], [users, 'POST', '/api/admin/users'], [users, 'PATCH', '/api/admin/users', { id: 'recViewer', role: 'Admin' }],
  ]) {
    const calls = mock(); const response = res();
    await handler(req(method, url, body), response, env);
    assert.equal(response.code, 403, `${method} ${url}`);
    assert.equal(calls.length, 2, 'Only session and account verification should run');
  }
});

test('permissions are reread after a role changes, without waiting for session expiry', async () => {
  mock('Editor');
  await requireUser(req('PATCH', '/api/ticketing'), env);
  mock('View');
  await assert.rejects(requireUser(req('PATCH', '/api/ticketing'), env), { status: 403 });
});
