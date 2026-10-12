import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/prospection.js';
import { LEADS_TABLE, CALLS_TABLE, emptyLead, normalizeLead, mappedLead, leadError, whatsappUrl } from '../src/lib/prospection.js';
import { parseCsv } from '../src/lib/prospectionImport.js';

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const response = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
const request = (body, method = 'POST', query = '') => ({ method, url: `/api/prospection${query}`, headers: { host: 'dashboard.example', origin: env.APP_ORIGIN, cookie: 'jeexpert_session=' + 'ab'.repeat(32) }, body });
function mock({ role = 'Editor', priorCall = false, failSummary = false } = {}) {
  const writes = [], reads = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url); reads.push(path);
    if (path.includes('tblJ85bJE0loqwNvU')) return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recActor'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
    if (path.endsWith('/recActor')) return { ok: true, json: async () => ({ id: 'recActor', fields: { username: 'editor', display_name: 'Editor', is_active: true, role } }) };
    const fields = init.body ? JSON.parse(init.body) : undefined;
    if (init.method !== 'GET') {
      writes.push({ path, method: init.method, body: fields });
      if (failSummary && path.endsWith('/recLead') && init.method === 'PATCH') return { ok: false, status: 503 };
      return { ok: true, json: async () => fields?.records ? ({ records: fields.records.map((record, index) => ({ id: `recSaved${index}`, fields: record.fields })) }) : ({ id: 'recLead', fields: fields?.fields || {} }) };
    }
    if (path.endsWith('/recLead')) return { ok: true, json: async () => ({ id: 'recLead', fields: { Name: 'Old Contact', 'Phone Number': '+21612345678' } }) };
    if (path.includes(CALLS_TABLE)) return { ok: true, json: async () => ({ records: priorCall ? [{ id: 'recCall', fields: { 'Lead ID': 'recLead', 'Date et Heure': '2026-01-01T10:00:00.000Z', 'Intérêt': 'Intéressé' } }] : [] }) };
    return { ok: true, json: async () => ({ records: [{ id: 'recLead', fields: { Name: 'Legacy Lead', 'Lead Source': 'Website' } }] }) };
  };
  return { writes, reads };
}
const lead = { ...emptyLead(), lastName: 'Test', firstName: 'Lead', phone: '+21612345678', email: 'lead@example.com' };
test('legacy leads load from the requested base and default to Non contacté', async () => {
  const { reads } = mock(), res = response(); await handler(request(null, 'GET'), res, env);
  assert.equal(res.code, 200); assert.equal(res.body.leads[0].interest, 'Non contacté'); assert.equal(res.body.leads[0].source, 'Website');
  assert.ok(reads.some(path => path.includes(`appK0Trc6L5MEKcR2/${LEADS_TABLE}`)));
});
test('View users can read but cannot mutate leads or calls', async () => {
  const { writes } = mock({ role: 'View' }), res = response(); await handler(request({ action: 'save', input: lead }), res, env);
  assert.equal(res.code, 403); assert.equal(writes.length, 0);
});
test('cross-origin requests and invalid leads are rejected without writes', async () => {
  const { writes } = mock();
  const badOrigin = request({ action: 'save', input: lead }); badOrigin.headers.origin = 'https://other.example';
  const res = response(); await handler(badOrigin, res, env); assert.equal(res.code, 403);
  for (const input of [{ ...lead, email: 'bad' }, { ...lead, interest: 'Invalid' }, { ...lead, followUp: '2026-02-31' }]) {
    const result = response(); await handler(request({ action: 'save', input }), result, env); assert.equal(result.code, 400);
  }
  assert.equal(writes.length, 0);
});
test('save preserves other Airtable fields and never allows arbitrary table writes', async () => {
  const { writes } = mock(), res = response(); await handler(request({ action: 'save', id: 'recLead', input: { ...lead, Name: 'Forged' } }), res, env);
  assert.equal(res.code, 200); assert.equal(writes[0].body.fields.Name, 'Lead Test'); assert.equal(writes[0].body.fields.Status, undefined);
});
test('import uses stable row keys to safely resume and rejects an entire invalid batch', async () => {
  const { writes } = mock(), res = response(); await handler(request({ action: 'import', importId: 'import-123', rows: [{ index: 0, input: lead }] }), res, env);
  assert.equal(res.code, 200); assert.deepEqual(writes[0].body.performUpsert.fieldsToMergeOn, ['Import Key']); assert.equal(writes[0].body.records[0].fields['Import Key'], 'recActor:import-123:0');
  const invalid = response(); await handler(request({ action: 'import', importId: 'import-123', rows: [{ index: 0, input: lead }, { index: 1, input: { ...lead, email: 'bad' } }] }), invalid, env);
  assert.equal(invalid.code, 400); assert.equal(writes.length, 1);
});
test('call logs the authenticated author and updates last contact and interest', async () => {
  const { writes } = mock(), res = response(); await handler(request({ action: 'call', id: 'recLead', key: 'activity-123', date: '2026-01-01T10:00:00Z', channel: 'Phone', interest: 'Intéressé', comment: 'Call back', author: 'Forged' }), res, env);
  assert.equal(res.code, 200); assert.equal(writes[0].body.records[0].fields['Called By'], 'Editor (editor)');
  assert.equal(writes[1].body.fields['Last Contacted'], '2026-01-01T10:00:00.000Z'); assert.equal(writes[1].body.fields['Intérêt'], 'Intéressé');
});
test('call retries recover previous activity and partial summary failure returns a warning', async () => {
  const { writes } = mock({ priorCall: true, failSummary: true }), res = response();
  await handler(request({ action: 'call', id: 'recLead', key: 'activity-123', date: '2026-01-01T10:00:00Z', channel: 'Phone', interest: 'Intéressé', comment: '' }), res, env);
  assert.equal(res.code, 200); assert.ok(res.body.warning); assert.equal(writes.length, 1); assert.ok(writes[0].path.endsWith('/recLead'));
});
test('history is limited to the selected lead, including legacy calls with matching name and phone', async () => {
  const { reads, writes } = mock({ priorCall: true }), res = response();
  await handler(request(null, 'GET', '?leadId=recLead'), res, env);
  assert.equal(res.code, 200); assert.equal(res.body.calls.length, 1); assert.equal(writes.length, 0);
  const query = new URL(reads.find(path => path.includes(CALLS_TABLE))).searchParams.get('filterByFormula');
  assert.ok(query.includes("{Lead ID}='recLead'")); assert.ok(query.includes("{Phone number}='+21612345678'")); assert.ok(query.includes("{Full Name}='Old Contact'"));
});
test('delete cannot target another table or malformed record ID', async () => {
  const { writes } = mock(), invalid = response();
  await handler(request({ action: 'delete', id: '../recLead' }), invalid, env);
  assert.equal(invalid.code, 400); assert.equal(writes.length, 0);
  const res = response(); await handler(request({ action: 'delete', id: 'recLead' }), res, env);
  assert.equal(res.code, 200); assert.equal(writes[0].method, 'DELETE'); assert.ok(writes[0].path.endsWith(`${LEADS_TABLE}/recLead`));
});
test('CSV handles quoted delimiters, escaped quotes, newlines and leading zero phones', () => {
  assert.deepEqual(parseCsv('\uFEFFNom;Téléphone;Notes\r\n"A; B";00123456789;"Hello\n""friend"""'), [['Nom', 'Téléphone', 'Notes'], ['A; B', '00123456789', 'Hello\n"friend"']]);
  assert.throws(() => parseCsv('Nom\n"broken'));
});
test('mapping validates interests, converts Excel dates and preserves phone strings', () => {
  const input = mappedLead(['Test', '00123456789', 'interesse', '01/02/2026'], { lastName: '0', phone: '1', interest: '2', followUp: '3' });
  assert.equal(input.phone, '00123456789'); assert.equal(input.interest, 'Intéressé'); assert.equal(input.followUp, '2026-02-01'); assert.equal(leadError(input), '');
  assert.equal(mappedLead(['Test', '46023'], { lastName: '0', followUp: '1' }).followUp, '2026-01-01');
  assert.equal(whatsappUrl('+216 12 345 678'), 'https://wa.me/21612345678'); assert.equal(whatsappUrl('abc'), '');
  assert.equal(normalizeLead({ id: 'rec1', fields: { Name: 'Legacy' } }).name, 'Legacy');
});


test('email uses selected configured sender and stored lead recipient, rejects arbitrary sender', async () => {
  const { writes } = mock(); const base = globalThis.fetch;
  globalThis.fetch = async (url, init) => String(url).endsWith('/recLead') && init.method === 'GET' ? { ok: true, json: async () => ({ id: 'recLead', fields: { Name: 'Lead', Email: 'lead@example.com' } }) } : base(url, init);
  const settings = { ...env, RESEND_API_KEY: 'fake', RESEND_FROM_CONTACT: 'Contact <contact@example.com>' };
  let res = response(); await handler(request(null, 'GET', '?senders=1'), res, settings);
  assert.ok(res.body.senders.some(sender => sender.key === 'contact' && sender.address === settings.RESEND_FROM_CONTACT));
  const body = { action: 'email', id: 'recLead', key: 'email-request123', fromKey: 'contact', subject: 'Suivi', message: 'Bonjour', toEmail: 'forged@example.com' };
  res = response(); await handler(request(body), res, settings); assert.equal(res.code, 200);
  const sent = writes.find(write => write.path === 'https://api.resend.com/emails');
  assert.deepEqual(sent.body.to, ['lead@example.com']); assert.equal(sent.body.from, settings.RESEND_FROM_CONTACT); assert.equal(sent.body.text, 'Bonjour');
  res = response(); await handler(request({ ...body, fromKey: 'forged@example.com' }), res, settings); assert.equal(res.code, 400);
  assert.equal(writes.filter(write => write.path === 'https://api.resend.com/emails').length, 1);
});
