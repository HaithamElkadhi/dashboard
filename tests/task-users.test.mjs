import test from 'node:test';
import assert from 'node:assert/strict';
import proxy from '../api/proxy.js';
import { BASE_ID, TABLES } from '../src/lib/config.js';
import { normalizeTask, createTask } from '../src/lib/airtable.js';
const original = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = original; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const response = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, send(body) { this.body = body; } });
function setup(active = true) {
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url);
    if (path.includes('tblJ85bJE0loqwNvU')) return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recActor'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
    if (path.endsWith('/recActor')) return { ok: true, json: async () => ({ id: 'recActor', fields: { username: 'admin', is_active: true } }) };
    if (path.endsWith('/recAssignee')) return { ok: true, json: async () => ({ id: 'recAssignee', fields: { username: 'teacher', display_name: 'New colleague', is_active: active } }) };
    writes.push(JSON.parse(init.body));
    return { ok: true, status: 200, headers: { get() { return 'application/json'; } }, text: async () => '{}' };
  };
  return writes;
}
const request = fields => ({ method: 'POST', url: `/api/proxy?__p=${BASE_ID}/${TABLES.tasks}`, headers: { host: 'dashboard.example', origin: env.APP_ORIGIN, cookie: 'jeexpert_session=' + 'ab'.repeat(32) }, body: { fields } });
test('task assignee name is derived from an active dashboard account', async () => {
  const writes = setup(), res = response();
  await proxy(request({ Description: 'Task', 'Assigned User ID': 'recAssignee', 'Assigned User Name': 'Forged' }), res, env);
  assert.equal(res.code, 200); assert.equal(writes[0].fields['Assigned User Name'], 'New colleague');
});
test('inactive and invalid task assignees are rejected before task writes', async () => {
  for (const id of ['recAssignee', 'unknown']) {
    const writes = setup(false), res = response(); await proxy(request({ 'Assigned User ID': id }), res, env);
    assert.equal(res.code, 400); assert.equal(writes.length, 0);
  }
});
test('task creation stores a platform user ID without adding it to legacy select choices', async () => {
  let payload;
  globalThis.fetch = async (_url, init) => { payload = JSON.parse(init.body); return { ok: true, json: async () => ({ id: 'recTask', fields: { ...payload.fields, 'Assigned User Name': 'New colleague' } }) }; };
  const task = await createTask({ name: 'Follow up', assignedTo: 'recAssignee', ddl: '2026-10-15', notes: 'Description', type: 'Other', priority: 'Medium', status: 'Todo' });
  assert.equal(payload.fields['Assigned User ID'], 'recAssignee'); assert.equal(payload.fields['Assigned To'], undefined);
  assert.equal(task.assignedTo, 'New colleague'); assert.equal(task.assignedUserId, 'recAssignee');
  assert.equal(normalizeTask({ fields: { 'Assigned To': 'Haitham' } }).assignedTo, 'Haitham');
});
