import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { escapeEmailHtml } from '../api/student-documents.js';
import { DOCUMENT_TABLES, buildDocumentItems, emailTemplate } from '../src/lib/studentDocuments.js';
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', RESEND_API_KEY: 'test', RESEND_FROM: 'team@example.com', NODE_ENV: 'production', APP_ORIGIN: 'https://dashboard.example' };
const req = (body, extra = {}) => ({ method: body ? 'POST' : 'GET', url: '/api/student-documents?studentId=recStudent', headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: 'jeexpert_session=' + 'ab'.repeat(32) }, body, ...extra });
const res = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
const folder = { id: 'recFolder', source: 'Academic', fields: { Prospect: ['recStudent'], Name: 'Academic file', Documents: [{ id: 'attPassport', filename: 'Passport.pdf', type: 'application/pdf', url: 'https://example.com/passport.pdf' }] } };
const key = 'Academic:recFolder:Documents:attPassport';
function mock(options = {}) {
  const state = { writes: [], emails: [], reviews: options.reviews || [], events: [], readUrls: [], uploads: [] };
  globalThis.fetch = async (url, init = {}) => {
    url = String(url); const data = init.body ? JSON.parse(init.body) : null; let body;
    if (url.includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (url.includes('tblYzfwb0CBFXOFsz/')) body = { id: 'recUser', fields: { username: 'expert', display_name: 'Expert', is_active: !(options.inactive && url.endsWith('/recOther')) } };
    else if (url.includes('api.resend.com')) { state.emails.push({ data, headers: init.headers }); if (options.failEmail) return { ok: false, status: 400 }; body = { id: 'email123' }; }
    else if (url.includes('content.airtable.com')) { state.uploads.push(data); body = {}; }
    else if (url.includes('tblQPh56AAmCe1bTj/')) body = { id: 'recStudent', fields: { Name: 'First', Surname: 'Student', Email: 'student@example.com', Documents: ['recFolder'], 'Bourse-Documents': ['recScholarship'] } };
    else if (url.includes(DOCUMENT_TABLES.activity)) {
      if (init.method === 'POST') { state.writes.push({ table: 'activity', data }); if (options.failHistory) return { ok: false, status: 503 }; body = { id: 'recEvent' + state.events.length, fields: data.fields }; state.events.push(body); }
      else if (init.method === 'PATCH') { if (options.failFinalize) return { ok: false, status: 503 }; const row = state.events.find(row => url.endsWith('/' + row.id)); Object.assign(row.fields, data.fields); body = row; }
      else { state.readUrls.push(url); const id = new URL(url).searchParams.get('filterByFormula').match(/\{Event ID\}='([^']+)'/)?.[1]; body = { records: id ? state.events.filter(row => row.fields['Event ID'] === id) : state.events }; }
    } else if (url.includes(DOCUMENT_TABLES.reviews)) {
      if (init.method === 'POST' || init.method === 'PATCH') { state.writes.push({ table: 'reviews', data }); if (options.failReview || (options.failUploadFinalize && init.method === 'PATCH' && !data.fields['Document Key'])) return { ok: false, status: 400 }; let row = state.reviews.find(row => url.endsWith('/' + row.id)); if (!row) { row = { id: 'recReview', fields: {} }; state.reviews.push(row); } Object.assign(row.fields, data.fields); body = row; }
      else { state.readUrls.push(url); body = { records: state.reviews }; }
    } else if (url.includes(DOCUMENT_TABLES.Academic)) { if (init.method === 'POST' || init.method === 'PATCH') { state.writes.push({ table: 'Academic', data }); body = { id: 'recFolder', fields: data.fields }; } else { state.readUrls.push(url); body = { records: [folder] }; } }
    else if (url.includes(DOCUMENT_TABLES.Scholarship)) { state.readUrls.push(url); body = { records: [] }; }
    else throw new Error('Unexpected mocked endpoint');
    return { ok: true, json: async () => body };
  };
  return state;
}
test('merges both attachment sources, separate versions and requested items without duplicate originals', () => {
  const scholarship = { id: 'recScholarship', source: 'Scholarship', fields: { 'Actes de naissance': [{ id: 'attBirth', filename: 'Birth.jpg' }] } };
  const reviews = [{ id: 'recReview', fields: { 'Document Key': key, Source: 'Academic', 'Document Name': 'Passport', 'Review Status': 'Validated', Versions: [{ id: 'attNew', filename: 'New.pdf' }] } }, { id: 'recRequest', fields: { 'Document Key': 'requested:1', Source: 'Scholarship', 'Document Name': 'Tax certificate', 'Review Status': 'Missing' } }];
  const docs = buildDocumentItems([folder, scholarship], reviews);
  assert.equal(docs.length, 3); assert.equal(docs[0].files[0].id, 'attNew'); assert.equal(docs[0].files[1].id, 'attPassport'); assert.equal(docs[2].status, 'Missing');
});
test('email templates distinguish received and validated, exclude internal notes and escape HTML', () => {
  const doc = { name: 'Passport', note: 'PRIVATE INTERNAL', reason: 'Scan all pages' };
  assert.match(emailTemplate('received', { name: 'Student' }, [doc]).message, /will now be reviewed/);
  assert.match(emailTemplate('correction', { name: 'Student' }, [doc]).message, /Scan all pages/);
  assert.doesNotMatch(emailTemplate('validated', {}, [doc]).message, /PRIVATE INTERNAL/);
  assert.equal(escapeEmailHtml('<script>&'), '&lt;script&gt;&amp;');
});
test('anonymous, invalid student IDs and untrusted origins are refused before document reads', async () => {
  const state = mock(); let response = res(); await handler(req(undefined, { headers: {} }), response, env); assert.equal(response.code, 401);
  response = res(); await handler(req(undefined, { url: '/api/student-documents?studentId=bad%27' }), response, env); assert.equal(response.code, 400);
  response = res(); await handler(req({ action: 'request' }, { headers: { ...req().headers, origin: 'https://evil.example' } }), response, env); assert.equal(response.code, 403); assert.equal(state.readUrls.length, 0);
});
test('GET scopes sources, review and history queries to the student and exposes both groups', async () => {
  const state = mock(), response = res(); await handler(req(), response, env);
  assert.equal(response.code, 200); assert.equal(response.body.student.email, 'student@example.com'); assert.equal(response.body.documents.length, 1);
  assert.equal(state.readUrls.length, 4); for (const url of state.readUrls) assert.match(new URL(url).searchParams.get('filterByFormula'), /recStudent|recFolder|recScholarship/);
});
test('request creates a linked checklist item and audit using server identity and time', async () => {
  const state = mock(), response = res(); await handler(req({ action: 'request', source: 'Scholarship', name: 'Tax certificate', requirement: 'Optional', due: '2026-12-01', actor: 'forged' }), response, env);
  assert.equal(response.code, 200); const fields = state.reviews[0].fields;
  assert.equal(fields['Student Record ID'], 'recStudent'); assert.equal(fields['Review Status'], 'Missing'); assert.equal(fields['Updated By'], 'Expert (expert)');
  assert.equal(state.events[0].fields.Result, 'Applied'); assert.equal(state.events[0].fields['Actor User ID'], 'recUser');
});
test('review validates status and account, prevents foreign document edits and missing-file validation', async () => {
  const review = { id: 'recReview', fields: { 'Document Key': 'requested:1', 'Student Record ID': 'recStudent', Source: 'Academic', 'Document Name': 'CV', 'Updated At': '2026-10-04T10:00:00Z' } };
  const state = mock({ reviews: [review] });
  for (const body of [{ action: 'review', key: 'foreign', status: 'Validated', requirement: 'Required' }, { action: 'review', key: 'requested:1', expectedUpdatedAt: review.fields['Updated At'], status: 'Validated', requirement: 'Required' }, { action: 'review', key, status: 'Needs correction', requirement: 'Required' }, { action: 'folder', folderId: 'recForeign', source: 'Academic', status: 'Complete' }]) { const response = res(); await handler(req(body), response, env); assert.ok([400, 404].includes(response.code)); }
  assert.equal(state.writes.length, 0);
});
test('review persists status, requirement and correction separately from internal note', async () => {
  const state = mock(), response = res(); await handler(req({ action: 'review', key, status: 'Needs correction', requirement: 'Required', note: 'Internal only', reason: 'All pages needed', assignedTo: 'recUser' }), response, env);
  assert.equal(response.code, 200); assert.equal(state.reviews[0].fields['Correction Reason'], 'All pages needed'); assert.equal(state.reviews[0].fields['Internal Note'], 'Internal only'); assert.equal(state.reviews[0].fields['Assigned User ID'], 'recUser');
});
test('stale review is refused without mutations', async () => {
  const state = mock({ reviews: [{ id: 'recReview', fields: { 'Document Key': key, Source: 'Academic', 'Updated At': 'new' } }] });
  let response = res(); await handler(req({ action: 'review', key, expectedUpdatedAt: 'old', status: 'Received', requirement: 'Required' }), response, env); assert.equal(response.code, 409);
  assert.equal(state.writes.length, 0);
});
test('inactive platform users cannot receive document assignments', async () => {
  const state = mock({ inactive: true }), response = res();
  await handler(req({ action: 'review', key, status: 'Received', requirement: 'Required', assignedTo: 'recOther' }), response, env);
  assert.equal(response.code, 400); assert.equal(state.writes.length, 0);
});
test('folder updates write the original source status without claiming per-file validation', async () => {
  const state = mock(), response = res();
  await handler(req({ action: 'folder', folderId: 'recFolder', status: 'Under Review', assignedTo: 'recUser', due: '2026-12-01', note: 'Review originals' }), response, env);
  assert.equal(response.code, 200);
  const update = state.writes.find(write => write.table === 'Academic').data.fields;
  assert.equal(update['Documents Status'], 'Under Review'); assert.equal(update['Review Deadline'], '2026-12-01');
  assert.equal(state.reviews.length, 0); assert.equal(state.events[0].fields.Result, 'Applied');
});
test('history preparation failure blocks writes; mutation failures are marked failed', async () => {
  let state = mock({ failHistory: true }), response = res(); await handler(req({ action: 'request', source: 'Academic', name: 'CV' }), response, env); assert.equal(response.code, 503); assert.equal(state.reviews.length, 0);
  state = mock({ failReview: true }); response = res(); await handler(req({ action: 'request', source: 'Academic', name: 'CV' }), response, env); assert.equal(response.code, 503); assert.equal(state.events[0].fields.Result, 'Failed');
});
test('upload appends a new version and resets review without overwriting source attachments', async () => {
  const state = mock(), response = res(); await handler(req({ action: 'upload', key, filename: 'New.pdf', contentType: 'application/pdf', file: Buffer.from('%PDF-test').toString('base64') }), response, env);
  assert.equal(response.code, 200); assert.equal(state.uploads.length, 1); assert.equal(state.reviews[0].fields['Review Status'], 'Received'); assert.equal(state.writes.filter(write => write.table === 'Academic').length, 0);
});
test('unsupported and oversized uploads are refused before recording activity', async () => {
  const state = mock();
  for (const body of [{ filename: 'payload.html', contentType: 'text/html', file: 'dGVzdA==' }, { filename: 'Large.pdf', contentType: 'application/pdf', file: 'A'.repeat(4 * 1024 * 1024 + 1) }]) { const response = res(); await handler(req({ action: 'upload', key, ...body }), response, env); assert.equal(response.code, 400); }
  assert.equal(state.writes.length, 0);
});
test('uploaded file with failed final status stays pending and explicitly warns against a second upload', async () => {
  const state = mock({ failUploadFinalize: true }), response = res();
  await handler(req({ action: 'upload', key, filename: 'New.pdf', contentType: 'application/pdf', file: Buffer.from('%PDF-test').toString('base64') }), response, env);
  assert.equal(response.code, 503); assert.match(response.body.error, /File uploaded/);
  assert.equal(state.uploads.length, 1); assert.equal(state.events[0].fields.Result, 'Pending');
});
test('email preview payload sends escaped text once, keeps history and does not update review statuses', async () => {
  const state = mock(), body = { action: 'email', eventId: '11111111-1111-4111-8111-111111111111', recipient: 'student@example.com', subject: 'Documents received', message: 'Hello <Student>' };
  for (let i = 0; i < 2; i++) { const response = res(); await handler(req(body), response, env); assert.equal(response.code, 200); }
  assert.equal(state.emails.length, 1); assert.match(state.emails[0].data.html, /&lt;Student&gt;/); assert.equal(state.emails[0].headers['Idempotency-Key'], 'documents-' + body.eventId);
  assert.equal(state.events[0].fields.Result, 'Sent'); assert.equal(state.events[0].fields.Message, body.message); assert.equal(state.reviews.length, 0);
});
test('email failure is logged and partial history failure returns a warning after confirmed send', async () => {
  const body = { action: 'email', eventId: '22222222-2222-4222-8222-222222222222', recipient: 'student@example.com', subject: 'Request', message: 'Send CV' };
  let state = mock({ failEmail: true }), response = res(); await handler(req(body), response, env); assert.equal(response.code, 503); assert.equal(state.events[0].fields.Result, 'Failed');
  state = mock({ failFinalize: true }); response = res(); await handler(req(body), response, env); assert.equal(response.code, 200); assert.equal(response.body.sent, true); assert.match(response.body.warning, /pending/);
});
