import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/documents-workspace.js';
import { BASE_ID, TABLES } from '../src/lib/config.js';
import { DOCUMENT_TABLES, VISA_DOCUMENT_TABLE, VISA_REVIEW_TABLE, VISA_VERSIONS_FIELD } from '../src/lib/studentDocuments.js';
import { selectedDocumentFiles } from '../src/lib/documentDownload.js';

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', RESEND_API_KEY: 'test', RESEND_FROM_CONTACT: 'contact@example.com', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const req = body => ({ method: body ? 'POST' : 'GET', url: '/api/documents-workspace?studentId=recStudent', headers: { cookie: 'jeexpert_session=' + 'ab'.repeat(32), host: 'dashboard.example', origin: env.APP_ORIGIN }, body });
const res = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
const file = id => ({ id, filename: `${id}.pdf`, url: `https://example.com/${id}.pdf`, size: 100 });
const visaKey = 'Visa:recVisa:Documents:attVisa';
function mock({ role = 'Editor', failVisa = false } = {}) {
  const student = { id: 'recStudent', fields: { Name: 'Test', Surname: 'Student', Email: 'student@example.com', Documents: ['recAcademic'], 'Bourse-Documents': ['recScholarship'], 'Visa Documents': ['recVisa'], 'Documents admission originaux': [file('attOriginal')] } };
  const tables = {
    [TABLES.prospects]: [student],
    [DOCUMENT_TABLES.Academic]: [{ id: 'recAcademic', fields: { Prospect: ['recStudent'], Documents: [file('attAcademic'), file('attKeep')] } }],
    [DOCUMENT_TABLES.Scholarship]: [{ id: 'recScholarship', fields: { Prospect: ['recStudent'], 'Actes de naissance': [file('attBirth')] } }],
    [VISA_DOCUMENT_TABLE]: [{ id: 'recVisa', fields: { Prospect: ['recStudent'], Documents: [file('attVisa'), file('attVisaKeep')] } }],
    [DOCUMENT_TABLES.reviews]: [], [VISA_REVIEW_TABLE]: [], [DOCUMENT_TABLES.activity]: [],
  };
  const writes = [], emails = [], uploads = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url), payload = init.body && JSON.parse(init.body);
    if (path.includes('tblJ85bJE0loqwNvU')) return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
    if (path.endsWith('/recUser')) return { ok: true, json: async () => ({ id: 'recUser', fields: { username: 'expert', display_name: 'Expert', is_active: true, role } }) };
    if (path.includes('api.resend.com')) { emails.push({ payload, headers: init.headers }); return { ok: true, json: async () => ({ id: 'email123' }) }; }
    if (path.includes('content.airtable.com')) { uploads.push(path); return { ok: true, json: async () => ({}) }; }
    const parsed = new URL(path), segments = parsed.pathname.split('/'), table = segments[3], id = segments[4];
    assert.ok(tables[table], `Unexpected table ${table}`);
    if (failVisa && table === VISA_DOCUMENT_TABLE) return { ok: false, status: 503 };
    if (init.method === 'POST') { const record = { id: 'recNew' + tables[table].length, fields: payload.fields }; tables[table].push(record); writes.push({ table, method: 'POST', payload }); return { ok: true, json: async () => record }; }
    if (init.method === 'PATCH') { const record = tables[table].find(row => row.id === id); assert.ok(record); Object.assign(record.fields, payload.fields); writes.push({ table, method: 'PATCH', payload }); return { ok: true, json: async () => record }; }
    if (init.method === 'DELETE') { tables[table] = tables[table].filter(row => row.id !== id); writes.push({ table, method: 'DELETE' }); return { ok: true, json: async () => ({ deleted: true }) }; }
    if (id) return { ok: true, json: async () => tables[table].find(row => row.id === id) };
    const formula = parsed.searchParams.get('filterByFormula') || '';
    const eventId = formula.match(/\{Event ID\}='([^']+)'/)?.[1];
    return { ok: true, json: async () => ({ records: eventId ? tables[table].filter(row => row.fields['Event ID'] === eventId) : tables[table] }) };
  };
  return { tables, writes, emails, uploads };
}

test('workspace loads all three categories plus admission originals without treating student links as files', async () => {
  mock(); const response = res(); await handler(req(), response, env);
  assert.equal(response.code, 200);
  assert.equal(response.body.documents.length, 6);
  assert.deepEqual(new Set(response.body.documents.map(doc => doc.source)), new Set(['Academic', 'Scholarship', 'Visa']));
  assert.equal(response.body.documents.find(doc => doc.attachmentId === 'attOriginal').sourceTable, TABLES.prospects);
  assert.equal(selectedDocumentFiles(response.body.documents, [visaKey]).files[0].name, 'Visa/attVisa.pdf');
});

test('selected student files become email attachments; repeat request sends only once', async () => {
  const state = mock(), body = { action: 'email', recipient: 'student@example.com', subject: 'Documents', message: 'Bonjour', keys: [visaKey, 'Scholarship:recScholarship:Actes de naissance:attBirth'], eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
  let response = res(); await handler(req(body), response, env); assert.equal(response.code, 200);
  assert.equal(state.emails.length, 1);
  assert.deepEqual(state.emails[0].payload.attachments.map(file => file.filename), ['attVisa.pdf', 'attBirth.pdf']);
  response = res(); await handler(req(body), response, env); assert.equal(response.code, 200); assert.equal(state.emails.length, 1);
  response = res(); await handler(req({ ...body, keys: [visaKey] }), response, env); assert.equal(response.code, 409);
});

test('foreign documents and recipients are rejected before email submission', async () => {
  const state = mock();
  const body = { action: 'email', recipient: 'student@example.com', subject: 'Documents', message: 'Bonjour', keys: ['Visa:recOther:Documents:attForeign'], eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' };
  let response = res(); await handler(req(body), response, env); assert.equal(response.code, 400);
  response = res(); await handler(req({ ...body, keys: [visaKey], recipient: 'other@example.com' }), response, env); assert.equal(response.code, 400);
  assert.equal(state.emails.length, 0); assert.equal(state.writes.length, 0);
});

test('visa comments use separate review table with server actor and timestamp', async () => {
  const state = mock(), response = res();
  await handler(req({ action: 'comment', key: visaKey, comment: 'Scan lisible', expectedUpdatedAt: '' }), response, env);
  assert.equal(response.code, 200);
  const review = state.tables[VISA_REVIEW_TABLE][0];
  assert.equal(review.fields.Source, 'Visa'); assert.equal(review.fields['Student Record ID'], 'recStudent');
  assert.match(review.fields['Internal Note'], /Expert \(expert\)/); assert.match(review.fields['Internal Note'], /Scan lisible/);
  assert.equal(state.tables[DOCUMENT_TABLES.reviews].length, 0);
});

test('deletion keeps unselected original files and removes selected versions only', async () => {
  const state = mock();
  state.tables[VISA_REVIEW_TABLE].push({ id: 'recReview', fields: { 'Document Key': visaKey, Source: 'Visa', Versions: [file('attVersion')], 'Updated At': '2026-10-14T10:00:00Z' } });
  const response = res();
  await handler(req({ action: 'delete', keys: [visaKey], expected: [{ key: visaKey, updatedAt: '2026-10-14T10:00:00Z', fileIds: ['attVersion', 'attVisa'] }] }), response, env);
  assert.equal(response.code, 200);
  assert.deepEqual(state.tables[VISA_DOCUMENT_TABLE][0].fields.Documents, [{ id: 'attVisaKeep' }]);
  assert.equal(state.tables[VISA_REVIEW_TABLE].length, 0);
  assert.equal(state.tables[DOCUMENT_TABLES.Academic][0].fields.Documents.length, 2);
});

test('stale selection and foreign deletion never remove any files', async () => {
  const state = mock();
  for (const keys of [[visaKey], ['foreign']]) {
    const response = res(); await handler(req({ action: 'delete', keys, expected: [] }), response, env);
    assert.ok([404, 409].includes(response.code));
  }
  assert.equal(state.writes.length, 0);
});

test('View users cannot comment, delete, upload or send emails', async () => {
  const state = mock({ role: 'View' });
  for (const action of ['comment', 'delete', 'upload', 'email']) { const response = res(); await handler(req({ action }), response, env); assert.equal(response.code, 403); }
  assert.equal(state.writes.length, 0); assert.equal(state.emails.length, 0);
});

test('Visa upload uses the Visa review attachment field', async () => {
  const state = mock(); state.tables[VISA_REVIEW_TABLE].push({ id: 'recReview', fields: { 'Document Key': 'requested:visa', Source: 'Visa', 'Document Name': 'Visa form', 'Updated At': 'stamp' } });
  const response = res(); await handler(req({ action: 'upload', key: 'requested:visa', expectedUpdatedAt: 'stamp', filename: 'visa.pdf', contentType: 'application/pdf', file: 'aGVsbG8=' }), response, env);
  assert.equal(response.code, 200);
  assert.ok(state.uploads[0].includes(`${BASE_ID}/recReview/${VISA_VERSIONS_FIELD}/uploadAttachment`));
});
