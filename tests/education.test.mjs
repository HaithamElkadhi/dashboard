import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { validateEducationFields, safeAttachmentUrl } from '../api/_lib/education.js';
import { EDUCATION_BASE, EDUCATION_ENTITIES } from '../src/lib/education.js';
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const req = (method = 'GET', body = {}) => ({ method, url: '/api/education', headers: { host: 'dashboard.example', origin: env.APP_ORIGIN, cookie: 'jeexpert_session=' + 'ac'.repeat(32) }, body });
const res = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
function mock(role = 'Admin', { missingLink = false } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url); calls.push({ path, ...init });
    let body;
    if (path.includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (path.endsWith('/recUser')) body = { id: 'recUser', fields: { username: 'admin', role, is_active: true } };
    else if (path.includes('/meta/')) body = { tables: Object.values(EDUCATION_ENTITIES).map(entity => ({ id: entity.tableId, fields: [] })) };
    else if (init.method === 'POST' || init.method === 'PATCH') body = { id: 'recSaved', fields: JSON.parse(init.body).fields };
    else if (path.endsWith('/recMissing')) return { ok: false, status: 404 };
    else if (/\/rec[A-Za-z]+$/.test(path)) body = { id: 'recStudent', fields: { 'Nom complet': 'Existing' } };
    else body = path.includes('offset=next') ? { records: [{ id: 'recSecond', fields: {} }] } : { records: [{ id: 'recFirst', fields: {} }], offset: 'next' };
    return { ok: true, json: async () => body };
  };
  return calls;
}
test('Education denies anonymous, Editor and View before reading its Airtable base', async () => {
  for (const role of ['Editor', 'View']) {
    const calls = mock(role), response = res(); await handler(req(), response, env);
    assert.equal(response.code, 403); assert.equal(calls.some(call => call.path.includes(EDUCATION_BASE)), false);
  }
  const request = req(); request.headers.cookie = ''; const response = res(); await handler(request, response, env); assert.equal(response.code, 401);
});
test('admin reads every page of all active tables', async () => {
  const calls = mock(), response = res(); await handler(req(), response, env);
  assert.equal(response.code, 200); assert.equal(Object.keys(response.body.tables).length, Object.keys(EDUCATION_ENTITIES).length);
  for (const rows of Object.values(response.body.tables)) assert.deepEqual(rows.map(row => row.id), ['recFirst', 'recSecond']);
  assert.equal(calls.filter(call => call.path.includes('pageSize=100')).length, Object.keys(EDUCATION_ENTITIES).length * 2);
});
test('admin can create and edit records; invalid links and origins cannot write', async () => {
  const calls = mock(); let response = res();
  await handler(req('POST', { entity: 'students', fields: { 'Nom complet': ' Child ', Parents: ['recParent'] } }), response, env);
  assert.equal(response.code, 200); assert.equal(response.body.record.fields['Nom complet'], 'Child');
  assert.ok(calls.some(call => call.path.includes(EDUCATION_ENTITIES.parents.tableId + '/recParent')));
  response = res(); await handler(req('PATCH', { entity: 'students', id: 'recStudent', fields: { 'Nom complet': 'Updated' } }), response, env); assert.equal(response.code, 200);
  response = res(); await handler(req('POST', { entity: 'students', fields: { 'Nom complet': 'Child', Parents: ['recMissing'] } }), response, env); assert.equal(response.code, 404);
  const request = req('POST', { entity: 'parents', fields: { 'Nom complet': 'Parent' } }); request.headers.origin = 'https://other.example'; response = res(); await handler(request, response, env); assert.equal(response.code, 403);
  assert.equal(calls.filter(call => ['POST', 'PATCH'].includes(call.method)).length, 2);
});
test('schema refuses unknown fields, impossible dates, invalid grades, select choices and forged attachments', () => {
  const valid = { Examen: 'Math test', 'Élève': ['recStudent'], Date: '2026-10-11', Note: 0 };
  assert.equal(validateEducationFields('results', valid).Note, 0);
  for (const change of [{ Note: 21 }, { Date: '2026-02-31' }, { Unexpected: 'x' }, { 'Élève': [] }, { 'Copies d’examen': [{ id: 'attForged' }] }, { 'Copies d’examen': [{ url: 'http://example.com/file.pdf' }] }]) assert.throws(() => validateEducationFields('results', { ...valid, ...change }), { status: 400 });
  assert.deepEqual(validateEducationFields('results', { ...valid, 'Copies d’examen': [{ id: 'attOld', url: 'https://example.com/file' }] }, { 'Copies d’examen': [{ id: 'attOld' }] })['Copies d’examen'], [{ id: 'attOld' }]);
  assert.deepEqual(validateEducationFields('results', { ...valid, 'Copies d’examen': [{ url: 'https://example.com/file.pdf' }] })['Copies d’examen'], [{ url: 'https://example.com/file.pdf' }]);
  for (const url of ['https://localhost/file', 'https://127.0.0.1/file', 'https://[::1]/file', 'https://x.internal/file', 'https://user:pass@example.com/file']) assert.equal(safeAttachmentUrl(url), false);
});
test('stale snapshots and deletions are refused', async () => {
  const calls = mock(); let response = res(); await handler(req('PATCH', { entity: 'students', id: 'recStudent', expected: { 'Nom complet': 'Stale' }, fields: { 'Nom complet': 'New' } }), response, env); assert.equal(response.code, 409);
  response = res(); await handler(req('DELETE'), response, env); assert.equal(response.code, 405); assert.equal(calls.some(call => ['POST', 'PATCH', 'DELETE'].includes(call.method)), false);
});

test('shared fields match UI and original UTF-8 Airtable schema exactly', async () => {
  const { EDUCATION_UI } = await import('../src/lib/educationUi.js');
  const { readFileSync } = await import('node:fs');
  const schema = JSON.parse(readFileSync('docs/education-airtable-schema.json', 'utf8').replace(/^\uFEFF/, ''));
  for (const [entity, definition] of Object.entries(EDUCATION_ENTITIES)) {
    if (EDUCATION_UI[entity]) assert.deepEqual(definition.fields.map(field => field.name), EDUCATION_UI[entity].fields.map(field => field.name));
    for (const field of definition.fields) assert.ok(schema.tables.find(table => table.id === definition.tableId).fields.some(item => item.name === field.name));
  }
  assert.throws(() => validateEducationFields('events', { Objet: 'Retard', 'Élève': ['recStudent'], Date: '2026-10-11', 'Catégorie': 'Forged', Observation: 'Test' }), { status: 400 });
});
test('rate-limited Airtable reads retry and expected field order is irrelevant', async () => {
  const calls = mock(), base = globalThis.fetch;
  let limited = false;
  globalThis.fetch = async (url, init) => {
    if (!limited && String(url).includes(EDUCATION_BASE)) { limited = true; return { ok: false, status: 429, headers: { get() { return null; } } }; }
    if (String(url).endsWith('/recStudent') && init.method === 'GET') return { ok: true, json: async () => ({ id: 'recStudent', fields: { Parents: [], 'Nom complet': 'Existing' } }) };
    return base(url, init);
  };
  const response = res(); await handler(req('PATCH', { entity: 'students', id: 'recStudent', expected: { 'Nom complet': 'Existing', Parents: [] }, fields: { 'Nom complet': 'Updated' } }), response, env);
  assert.equal(response.code, 200); assert.equal(limited, true); assert.equal(calls.filter(call => call.method === 'PATCH').length, 1);
});

test('inverse links and refreshed photo URLs do not cause false student edit conflicts', async () => {
  const calls = mock(), base = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith('/recStudent') && init.method === 'GET') return { ok: true, json: async () => ({ id: 'recStudent', fields: { 'Nom complet': 'Existing', Photo: [{ id: 'attPhoto', url: 'https://example.com/new-token' }], 'Education - Résultats': ['recNewNote'] } }) };
    return base(url, init);
  };
  const response = res();
  await handler(req('PATCH', { entity: 'students', id: 'recStudent', expected: { 'Nom complet': 'Existing', Photo: [{ id: 'attPhoto', url: 'https://example.com/old-token' }] }, fields: { 'Nom complet': 'Updated' } }), response, env);
  assert.equal(response.code, 200);
  assert.equal(calls.filter(call => call.method === 'PATCH').length, 1);
});

test('email derives the recipient from the linked parent and rejects unrelated documents', async () => {
  const calls = mock(), base = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/recStudent')) return { ok: true, json: async () => ({ fields: { Parents: ['recParent'] } }) };
    if (String(url).endsWith('/recParent')) return { ok: true, json: async () => ({ fields: { Email: 'parent@example.com' } }) };
    return base(url, init);
  };
  const body = { action: 'email', studentId: 'recStudent', parentId: 'recParent', subject: 'Note', body: 'Bonjour', requestId: 'request123' };
  let response = res(); await handler(req('POST', body), response, { ...env, RESEND_API_KEY: 'fake' });
  assert.equal(response.code, 200);
  const sent = calls.find(call => call.path === 'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(sent.body).to, ['parent@example.com']);
  assert.equal(sent.headers['Idempotency-Key'], 'education-request123');
  response = res(); await handler(req('POST', { ...body, parentId: 'recOther' }), response, env); assert.equal(response.code, 400);
  response = res(); await handler(req('POST', { ...body, source: { entity: 'results', id: 'recResult' } }), response, env); assert.equal(response.code, 400);
});

test('file upload checks type, size and actual record before using the attachment endpoint', async () => {
  const calls = mock();
  const body = { action: 'upload', entity: 'students', id: 'recStudent', field: 'Photo', file: { filename: 'photo.png', contentType: 'image/png', content: 'aGVsbG8=' } };
  let response = res(); await handler(req('POST', body), response, env); assert.equal(response.code, 200);
  assert.ok(calls.some(call => call.path.includes('content.airtable.com') && call.path.includes('fldywdTNsXkaA8lSq')));
  for (const change of [{ contentType: 'application/pdf' }, { content: 'invalid!' }, { filename: '../x.png' }]) {
    response = res(); await handler(req('POST', { ...body, file: { ...body.file, ...change } }), response, env); assert.equal(response.code, 400);
  }
  assert.throws(() => validateEducationFields('students', { 'Nom complet': 'Child', Photo: [{ url: 'https://example.com/a.png' }, { url: 'https://example.com/b.png' }] }), { status: 400 });
  const base = globalThis.fetch;
  globalThis.fetch = async (url, init) => String(url).endsWith('/recStudent') ? { ok: true, json: async () => ({ id: 'recStudent', fields: { Photo: [{ id: 'attPhoto' }] } }) } : base(url, init);
  response = res(); await handler(req('POST', body), response, env); assert.equal(response.code, 400);
});

test('attendance batches upserts and refuses students from another class', async () => {
  const calls = mock(), base = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/recStudent')) return { ok: true, json: async () => ({ fields: { Classe: ['recClass'] } }) };
    if (String(url).includes(EDUCATION_ENTITIES.students.tableId + '?')) return { ok: true, json: async () => ({ records: [{ id: 'recStudent', fields: { Classe: ['recClass'] } }] }) };
    if (String(url).includes(EDUCATION_ENTITIES.attendance.tableId + '?')) return { ok: true, json: async () => ({ records: [{ id: 'recExisting', fields: { Classe: ['recClass'], Date: '2026-10-11', 'Présence': 'Présent' } }] }) };
    if (init.method === 'PATCH' && String(url).endsWith(EDUCATION_ENTITIES.attendance.tableId)) {
      calls.push({ path: String(url), ...init });
      return { ok: true, json: async () => ({ records: JSON.parse(init.body).records.map((record, index) => ({ id: `rec${index}`, ...record })) }) };
    }
    return base(url, init);
  };
  const body = { action: 'attendance', date: '2026-10-11', classId: 'recClass', marks: [{ studentId: 'recStudent', status: 'Absent' }] };
  let response = res(); await handler(req('POST', body), response, env); assert.equal(response.code, 200);
  const upsert = JSON.parse(calls.find(call => call.method === 'PATCH').body);
  assert.deepEqual(upsert.performUpsert.fieldsToMergeOn, ['Appel']);
  assert.equal(response.body.records[0].fields['Présence'], 'Absent');
  response = res(); await handler(req('POST', { ...body, classId: 'recOther' }), response, env); assert.equal(response.code, 400);
  response = res(); await handler(req('POST', { ...body, expected: [] }), response, env); assert.equal(response.code, 409);
  response = res(); await handler(req('POST', { ...body, expected: [{ id: 'recExisting', fields: { Date: '2026-10-11', Classe: ['recClass'], 'Présence': 'Présent' } }] }), response, env); assert.equal(response.code, 200);
});
