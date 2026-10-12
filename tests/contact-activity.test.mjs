import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeContactActivity } from '../src/lib/contactActivity.js';
import handler from '../api/contact-activity.js';
const prospects = [{ id: 'recOne', email: 'one@example.com', lastContact: '2026-01-01' }, { id: 'recTwo', email: 'two@example.com', lastContact: null }];
test('linked events take precedence over email; duplicates and unrelated students are excluded', () => {
  const event = { key: 'ticket:one', studentIds: ['recOne'], recipient: 'two@example.com', kind: 'ticket', at: '2026-01-02T12:00:00Z', open: true, countsAsContact: true };
  const rows = mergeContactActivity(prospects, [event, event]);
  assert.equal(rows[0].activity.length, 1); assert.equal(rows[0].openTicketCount, 1); assert.equal(rows[0].lastContact, '2026-01-02'); assert.equal(rows[1].activity.length, 0);
});
test('unique email fallback is case insensitive; ambiguous shared emails do not attach', () => {
  const event = { key: 'email:one', recipient: ' ONE@example.com ', kind: 'email', at: '2026-02-01T12:00:00Z', countsAsContact: true };
  assert.equal(mergeContactActivity(prospects, [event])[0].lastContact, '2026-02-01');
  assert.equal(mergeContactActivity([...prospects, { id: 'recOther', email: 'one@example.com' }], [event])[0].activity.length, 0);
});
test('open tickets keep their creation date; future appointment dates do not alter last contact', () => {
  const rows = mergeContactActivity(prospects, [{ key: 'booking', studentIds: ['recOne'], kind: 'appointment', at: '2026-01-03T10:00:00Z', appointmentAt: '2030-01-01', countsAsContact: true }, { key: 'ticket', studentIds: ['recOne'], kind: 'ticket', at: '2025-01-01', open: true, countsAsContact: true }]);
  assert.equal(rows[0].lastContact, '2026-01-03'); assert.equal(rows[0].openTicketCount, 1); assert.equal(rows[0].manualLastContact, '2026-01-01');
  assert.equal(mergeContactActivity(rows, [])[0].lastContact, '2026-01-01');
});
test('activity API refuses anonymous access and writes', async () => {
  const res = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  let response = res(); await handler({ method: 'GET', headers: {} }, response, {}); assert.equal(response.code, 401);
  response = res(); await handler({ method: 'POST', headers: {} }, response, {}); assert.equal(response.code, 405);
});

test('activity API loads prospection with its token and exposes standalone lead events', async () => {
  const original = globalThis.fetch;
  let sawProspection = false;
  globalThis.fetch = async (url, init) => {
    const path = String(url);
    let body = { records: [] };
    if (path.includes('tblJ85bJE0loqwNvU')) body = { records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] };
    else if (path.endsWith('/recUser')) body = { id: 'recUser', fields: { username: 'agent', role: 'View', is_active: true } };
    else if (path.includes('appK0Trc6L5MEKcR2')) {
      sawProspection = true;
      assert.equal(init.headers.Authorization, 'Bearer prospection-token');
      body = { records: [{ id: 'recCall', fields: { 'Full Name': 'Lead Test', 'Lead ID': 'recLead', 'Date et Heure': '2026-10-12T10:00:00Z', 'Canal of Call': 'WhatsApp', 'Called By': 'Agent', Comment: 'Suivi', 'Intérêt': 'Intéressé' } }] };
    }
    return { ok: true, json: async () => body };
  };
  try {
    const response = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ method: 'GET', headers: { cookie: 'jeexpert_session=' + 'ac'.repeat(32) } }, response, { AIRTABLE_API_KEY: 'test', AIRTABLE_PROSPECTION_TOKEN: 'prospection-token' });
    assert.equal(response.code, 200);
    assert.equal(sawProspection, true);
    assert.equal(response.body.prospectionEvents[0].by, 'Agent');
    assert.equal(response.body.prospectionEvents[0].href, '/operations/prospection?lead=recLead');
  } finally { globalThis.fetch = original; }
});
