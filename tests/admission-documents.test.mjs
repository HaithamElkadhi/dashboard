import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/admission-documents.js';
import { ADMISSION_DOCUMENTS, REQUESTED_DOCUMENTS_FIELD as F, mergeRequestedDocuments } from '../src/lib/admissionDocuments.js';
const original = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = original; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const current = 'Existing scholarship document\n CV ';
function req(body = {}, method = 'POST') { return { method, url: '/api/admission-documents?studentId=recStudent', headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'fa'.repeat(32) }, body: { studentId: 'recStudent', documentIds: ['passport', 'cv'], expected: current, ...body } }; }
function res() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } }; }
function mock(role = 'Editor') {
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    let body;
    if (String(url).includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (String(url).endsWith('/recUser')) body = { id: 'recUser', fields: { username: 'operator', is_active: true, role } };
    else if (init.method === 'PATCH') { writes.push(JSON.parse(init.body)); body = { id: 'recStudent', fields: writes.at(-1).fields }; }
    else body = { id: 'recStudent', fields: { [F]: current } };
    return { ok: true, json: async () => body };
  };
  return writes;
}
test('catalog has unique selectable IDs and merging preserves existing notes without duplicates', () => {
  assert.equal(new Set(ADMISSION_DOCUMENTS.map(doc => doc.id)).size, ADMISSION_DOCUMENTS.length);
  assert.equal(mergeRequestedDocuments(current, ['CV', 'Passeport', 'Passeport']), current + '\nPasseport');
});
test('adding documents updates only Documents demandés and preserves prior requests', async () => {
  const writes = mock(); const response = res(); await handler(req(), response, env);
  assert.equal(response.code, 200); assert.deepEqual(Object.keys(writes[0].fields), [F]);
  assert.equal(response.body.requested, current + '\nPasseport');
});
test('View may read but cannot add documents', async () => {
  const writes = mock('View'); let response = res(); await handler(req({}, 'GET'), response, env); assert.equal(response.code, 200);
  response = res(); await handler(req(), response, env); assert.equal(response.code, 403); assert.equal(writes.length, 0);
});
test('stale requests and arbitrary fields or document IDs are refused', async () => {
  const writes = mock();
  for (const [body, status] of [[{ expected: 'old' }, 409], [{ documentIds: ['unknown'] }, 400], [{ fields: { other: 'change' } }, 400]]) {
    const response = res(); await handler(req(body), response, env); assert.equal(response.code, status);
  }
  assert.equal(writes.length, 0);
});
test('anonymous and untrusted origin requests cannot mutate', async () => {
  const writes = mock();
  for (const [headers, status] of [[{}, 401], [{ ...req().headers, origin: 'https://evil.example' }, 403]]) {
    const request = req(); request.headers = headers; const response = res(); await handler(request, response, env); assert.equal(response.code, status);
  }
  assert.equal(writes.length, 0);
});
