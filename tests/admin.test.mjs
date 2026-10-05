import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin/users.js';
import { verifyPassword } from '../api/_lib/auth.js';

const env = { AIRTABLE_API_KEY: 'test', NODE_ENV: 'production', APP_ORIGIN: 'https://dashboard.example' };
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const req = (extra = {}) => ({ method: 'GET', headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'ab'.repeat(32) }, ...extra });
function response() { return { code: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, json(body) { this.body=body; } }; }
function mock({ admin = true, role, existing = false, pages = [], onCreate } = {}) {
  const calls = [];
  let created = false;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    let body;
    if (String(url).includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recAdmin'], expires_at: new Date(Date.now()+60000).toISOString() } }] };
    else if (String(url).endsWith('/recAdmin')) body = { id:'recAdmin', fields:{ username:'jeexpert', is_active:true, is_admin:admin, role } };
    else if (init.method === 'PATCH') body = { id: 'recOther', fields: { username: 'other', is_active: true, ...JSON.parse(init.body).fields } };
    else if (init.method === 'POST') {
      const payload = JSON.parse(init.body); onCreate?.(payload);
      created = true;
      body = { id:'recCreated', fields:payload.fields };
    } else if (String(url).includes('filterByFormula')) body = {records:existing ? [{id:'recDuplicate'}] : created ? [{id:'recCreated'}] : []};
    else body = pages.shift() || {records:[]};
    return {ok:true,json:async()=>body};
  };
  return calls;
}
test('anonymous requests cannot read or create users', async () => {
  const calls=mock();
  for (const method of ['GET','POST']) {
    const res=response(); await handler(req({method,headers:{host:'dashboard.example',origin:'https://dashboard.example'}}),res,env);
    assert.equal(res.code,401);
  }
  assert.equal(calls.length,0);
});
test('non-admin users cannot read or create users even with forged admin input', async () => {
  const calls=mock({admin:false});
  for (const method of ['GET','POST']) {
    const res=response(); await handler(req({method,body:{isAdmin:true}}),res,env); assert.equal(res.code,403);
  }
  assert.equal(calls.filter(call=>call.init.method==='POST').length,0);
});
test('admin listing paginates and never returns hashes or sessions', async () => {
  const calls=mock({pages:[{records:[{id:'recOne',fields:{username:'one',is_active:true,password_hash:'secret'}}],offset:'next'},{records:[{id:'recTwo',fields:{username:'two'}}]}]});
  const res=response(); await handler(req(),res,env);
  assert.equal(res.code,200); assert.equal(res.body.users.length,2);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
  assert.ok(calls.some(call=>call.url.includes('offset=next')));
});
test('admin creates active standard user with salted hash, never returns password', async () => {
  let payload;
  mock({onCreate:body=>{payload=body;}});
  const password='a-long-test-password';
  const res=response(); await handler(req({method:'POST',body:{username:' New.User ',displayName:'New User',password,isAdmin:true,is_admin:true}}),res,env);
  assert.equal(res.code,201); assert.equal(payload.fields.username,'new.user');
  assert.equal(payload.fields.is_admin,false); assert.equal(payload.fields.is_active,true);
  assert.ok(await verifyPassword(password,payload.fields.password_hash));
  assert.ok(!JSON.stringify(res.body).includes(password));
  assert.ok(!JSON.stringify(res.body).includes('password_hash'));
});
test('duplicate username is rejected without writing', async () => {
  const calls=mock({existing:true}); const res=response();
  await handler(req({method:'POST',body:{username:'existing',displayName:'Existing',password:'a-long-test-password'}}),res,env);
  assert.equal(res.code,409); assert.ok(!calls.some(call=>call.init.method==='POST'));
});
test('invalid username, short password and missing display name are rejected', async () => {
  const calls=mock();
  for (const body of [{username:"x' OR 1",displayName:'X',password:'a-long-test-password'},{username:'x',displayName:'X',password:'short'},{username:'x',displayName:'',password:'a-long-test-password'}]) {
    const res=response(); await handler(req({method:'POST',body}),res,env); assert.equal(res.code,400);
  }
  assert.ok(!calls.some(call=>call.init.method==='POST'));
});
test('admin mutations require a trusted origin', async () => {
  const calls=mock(); const res=response();
  await handler(req({method:'POST',headers:{...req().headers,origin:'https://evil.example'}}),res,env);
  assert.equal(res.code,403); assert.equal(calls.length,0);
});

test('admin can create a View account; roles are explicit and no admin checkbox can override View', async () => {
  let payload;
  mock({ onCreate: body => { payload = body; } });
  const res = response();
  await handler(req({ method: 'POST', body: { username: 'reader', displayName: 'Reader', password: 'test-view-password-123', role: 'View', is_admin: true } }), res, env);
  assert.equal(res.code, 201);
  assert.equal(payload.fields.role, 'View');
  assert.equal(payload.fields.is_admin, false);
  assert.equal(res.body.user.canWrite, false);
});

test('View can read the public users list, without password hashes', async () => {
  mock({ role: 'View', pages: [{ records: [{ id: 'recOther', fields: { username: 'other', role: 'Admin', password_hash: 'hidden-secret' } }] }] });
  const res = response(); await handler(req(), res, env);
  assert.equal(res.code, 200);
  assert.equal(res.body.users[0].role, 'Admin');
  assert.ok(!JSON.stringify(res.body).includes('hidden-secret'));
});

test('admin changes another account role but cannot remove their own admin access', async () => {
  const calls = mock();
  const res = response();
  await handler(req({ method: 'PATCH', body: { id: 'recOther', role: 'View' } }), res, env);
  assert.equal(res.code, 200); assert.equal(res.body.user.role, 'View');
  assert.equal(JSON.parse(calls.find(call => call.init.method === 'PATCH').init.body).fields.is_admin, false);
  const self = response();
  await handler(req({ method: 'PATCH', body: { id: 'recAdmin', role: 'View' } }), self, env);
  assert.equal(self.code, 400);
  assert.equal(calls.filter(call => call.init.method === 'PATCH').length, 1);
});
