import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, requireUser, digest, checkOrigin } from '../api/_lib/auth.js';
import proxy from '../api/proxy.js';
import login from '../api/auth/login.js';

const env = { AIRTABLE_API_KEY: 'test', NODE_ENV: 'production', APP_ORIGIN: 'https://dashboard.example' };
const req = (extra = {}) => ({ method: 'GET', headers: { host: 'dashboard.example', origin: 'https://dashboard.example' }, ...extra });
function response() { return { code: 200, headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(c) { this.code=c; return this; }, json(body) { this.body=body; }, send(body) { this.body=body; } }; }
const sessionRequest = () => req({ headers: { ...req().headers, cookie: 'jeexpert_session=' + 'ab'.repeat(32) } });
function mock(records, user = { id: 'recUser', fields: { username: 'jeexpert', display_name: 'JEExpert', is_active: true } }) {
  globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('/recUser') ? user : { records } });
}
const original = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = original; });
test('password hashes verify the correct password and reject wrong/malformed values', async () => {
  const hash = await hashPassword('a-test-password-123');
  assert.ok(await verifyPassword('a-test-password-123', hash));
  assert.equal(await verifyPassword('wrong', hash), false);
  assert.equal(await verifyPassword('anything', 'plaintext'), false);
});
test('unauthenticated APIs reject without contacting Airtable', async () => {
  globalThis.fetch = () => { throw new Error('must not fetch'); };
  const res = response(); await proxy(req({ url: '/api/proxy?__p=anything' }), res, env);
  assert.equal(res.code, 401);
});
test('valid session resolves user; expired and disabled users are refused', async () => {
  const record = { id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now()+60000).toISOString() } };
  mock([record]); assert.equal((await requireUser(sessionRequest(), env)).user.username, 'jeexpert');
  mock([{ ...record, fields: { ...record.fields, expires_at: '2000-01-01' } }]);
  await assert.rejects(requireUser(sessionRequest(), env), { status: 401 });
  mock([record], { id:'recUser', fields:{ is_active:false } });
  await assert.rejects(requireUser(sessionRequest(), env), { status:401 });
});
test('authenticated proxy refuses auth tables, traversal, other bases and unknown hosts', async () => {
  mock([{ id:'recSession', fields:{ user:['recUser'], expires_at:new Date(Date.now()+60000).toISOString() } }]);
  for (const path of ['appVHjUwJBU3wGrOW/tblYzfwb0CBFXOFsz', 'appkqvTuc8F0AhWPp/../appVHjUwJBU3wGrOW', 'other/table']) {
    const res=response(); await proxy({...sessionRequest(), url:'/api/proxy?__p='+encodeURIComponent(path)},res,env); assert.equal(res.code,403);
  }
});
test('mutations reject foreign or missing origins', () => {
  assert.throws(() => checkOrigin(req({headers:{host:'dashboard.example',origin:'https://evil.example'}}),env), {status:403});
  assert.throws(() => checkOrigin(req({headers:{host:'dashboard.example'}}),env), {status:403});
});
test('login throttles using persisted attempt rows before issuing any cookie', async () => {
  mock(Array.from({length:20},()=>({id:'recAttempt'})));
  const res=response(); await login(req({method:'POST',body:{username:'jeexpert',password:'test'}}),res,env);
  assert.equal(res.code,429); assert.equal(res.headers['Set-Cookie'],undefined);
});
test('session hashes do not reveal tokens', () => { assert.equal(digest('ab'.repeat(32)).length,64); assert.notEqual(digest('ab'.repeat(32)),'ab'.repeat(32)); });
