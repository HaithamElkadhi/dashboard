import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/shifts.js';
import { USERS_TABLE, SESSIONS_TABLE } from '../api/_lib/auth.js';
import {
  validateShift, validateRule, validateAbsence, overlaps, ruleOccurrences,
  localDateTimeToIso, zonedParts, validateRange, normalizeShift, SHIFT_TABLES,
} from '../src/lib/shifts.js';

const shift = {
  userId: 'recWorker', start: '2026-11-02T08:00:00Z', end: '2026-11-02T16:00:00Z',
  breakMinutes: 60, mode: 'Présentiel', note: '',
};
const rule = {
  id: 'recRule', userId: 'recWorker', weekdays: [1, 2, 3, 4, 5],
  startTime: '09:00', endTime: '17:00', breakMinutes: 60, mode: 'À distance',
  timeZone: 'Europe/Rome', validFrom: '2026-01-01', validTo: '', active: true,
};

test('shift validation supports overnight work and rejects invalid dates, duration or break', () => {
  const night = validateShift({ ...shift, start: '2026-11-02T21:00:00Z', end: '2026-11-03T05:00:00Z' });
  assert.equal(night.start, '2026-11-02T21:00:00.000Z');
  assert.equal(night.end, '2026-11-03T05:00:00.000Z');
  for (const patch of [
    { end: shift.start }, { end: '2026-11-03T09:00:00Z' },
    { breakMinutes: 480 }, { breakMinutes: -1 }, { breakMinutes: 1.5 },
    { start: '2026-02-30T08:00:00Z', end: '2026-03-02T16:00:00Z' },
    { userId: 'not-a-record' }, { mode: 'Anywhere' }, { unexpected: true },
  ]) assert.throws(() => validateShift({ ...shift, ...patch }), JSON.stringify(patch));
});

test('interval conflicts apply only to the same user and allow adjacent shifts', () => {
  assert.equal(overlaps(shift, { ...shift, start: '2026-11-02T15:00:00Z', end: '2026-11-02T17:00:00Z' }), true);
  assert.equal(overlaps(shift, { ...shift, start: shift.end, end: '2026-11-02T17:00:00Z' }), false);
  assert.equal(overlaps(shift, { ...shift, userId: 'recOther' }), false);
});

test('local times preserve Tunisia and Italy offsets and reject DST gaps and ambiguity', () => {
  assert.equal(localDateTimeToIso('2026-01-12', '09:00', 'Europe/Rome'), '2026-01-12T08:00:00.000Z');
  assert.equal(localDateTimeToIso('2026-07-13', '09:00', 'Europe/Rome'), '2026-07-13T07:00:00.000Z');
  assert.equal(localDateTimeToIso('2026-07-13', '09:00', 'Africa/Tunis'), '2026-07-13T08:00:00.000Z');
  assert.throws(() => localDateTimeToIso('2026-03-29', '02:30', 'Europe/Rome'));
  assert.throws(() => localDateTimeToIso('2026-10-25', '02:30', 'Europe/Rome'));
  assert.deepEqual(zonedParts('2026-07-13T07:00:00Z', 'Europe/Rome'), { date: '2026-07-13', time: '09:00' });
});

test('recurrence respects selected weekdays, inclusive validity and exclusive generation end', () => {
  const configured = { ...rule, validFrom: '2026-11-03', validTo: '2026-11-05' };
  const occurrences = ruleOccurrences(configured, '2026-11-02', '2026-11-09');
  assert.deepEqual(occurrences.map(value => value.sourceKey), [
    'rule:recRule:2026-11-03', 'rule:recRule:2026-11-04', 'rule:recRule:2026-11-05',
  ]);
  assert.deepEqual(ruleOccurrences({ ...rule, active: false }, '2026-11-02', '2026-11-09'), []);
  assert.equal(ruleOccurrences(rule, '2026-11-02', '2026-11-03').length, 1);
  assert.deepEqual(ruleOccurrences(configured, '2026-11-02', '2026-11-09'), occurrences);
});

test('recurring night shifts end on the next local day and keep deterministic source keys', () => {
  const occurrences = ruleOccurrences({ ...rule, weekdays: [1], startTime: '22:00', endTime: '06:00' }, '2026-11-02', '2026-11-03');
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].start, '2026-11-02T21:00:00.000Z');
  assert.equal(occurrences[0].end, '2026-11-03T05:00:00.000Z');
  assert.equal(occurrences[0].ruleId, 'recRule');
  assert.equal(occurrences[0].sourceKey, 'rule:recRule:2026-11-02');
});

test('rules reject empty or duplicate weekdays and invalid pause or validity', () => {
  const { id, ...input } = rule;
  assert.deepEqual(validateRule({ ...input, weekdays: [5, 1] }).weekdays, [1, 5]);
  for (const patch of [{ weekdays: [] }, { weekdays: [1, 1] }, { weekdays: [0] },
    { startTime: '25:00' }, { endTime: '09:00' }, { breakMinutes: 480 },
    { validTo: '2025-12-31' }, { timeZone: 'UTC' }, { active: 'yes' }]) {
    assert.throws(() => validateRule({ ...input, ...patch }), JSON.stringify(patch));
  }
});

test('absences validate bounded ranges and their configured type', () => {
  const input = { userId: 'recWorker', start: '2026-11-02T00:00:00Z', end: '2026-11-03T00:00:00Z', type: 'Congé', note: '' };
  assert.equal(validateAbsence(input).type, 'Congé');
  assert.throws(() => validateAbsence({ ...input, end: input.start }));
  assert.throws(() => validateAbsence({ ...input, type: 'Unknown' }));
  assert.throws(() => validateAbsence({ ...input, end: '2028-11-03T00:00:00Z' }));
  assert.throws(() => validateRange('2026-11-02', '2027-11-03'));
});

test('stored canceled shifts retain their user and historical values', () => {
  const normalized = normalizeShift({ id: 'recHistory', fields: { User: ['recInactive'], Start: shift.start, End: shift.end, Status: 'Annulé', Revision: 'rev1', 'Source Key': 'rule:old:2026-11-02' } });
  assert.equal(normalized.userId, 'recInactive');
  assert.equal(normalized.status, 'Annulé');
  assert.equal(normalized.revision, 'rev1');
  assert.equal(normalized.sourceKey, 'rule:old:2026-11-02');
});

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', NODE_ENV: 'production', APP_ORIGIN: 'https://dashboard.example' };
const req = (body, query = '?start=2026-11-02&end=2026-11-09') => ({
  method: body ? 'POST' : 'GET', url: `/api/shifts${query}`,
  headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: `jeexpert_session=${'ab'.repeat(32)}` }, body,
});
const res = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });

function mockApi({ role = 'Admin', shifts = [], rules = [], absences = [] } = {}) {
  const users = [
    { id: 'recAdmin', fields: { username: 'admin', display_name: 'Admin', is_active: true, role, password_hash: 'private' } },
    { id: 'recWorker', fields: { username: 'worker', display_name: 'Worker', is_active: true, role: 'Editor' } },
    { id: 'recInactive', fields: { username: 'former', display_name: 'Former colleague', is_active: false, role: 'Editor' } },
  ];
  const state = {
    [USERS_TABLE]: users,
    [SHIFT_TABLES.shifts]: structuredClone(shifts),
    [SHIFT_TABLES.rules]: structuredClone(rules),
    [SHIFT_TABLES.absences]: structuredClone(absences),
  };
  const calls = [];
  let counter = 0;
  globalThis.fetch = async (raw, init = {}) => {
    const url = new URL(raw), [table, id] = url.pathname.split('/').slice(3), method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ table, id, method, body, url: url.href });
    if (table === SESSIONS_TABLE) return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recAdmin'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
    const records = state[table];
    assert.ok(records, `Unknown mocked table ${table}`);
    if (method === 'POST') {
      const created = (body.records || [{ fields: body.fields }]).map(record => ({ id: `recCreated${++counter}`, fields: record.fields }));
      records.push(...created);
      return { ok: true, json: async () => body.records ? { records: created } : created[0] };
    }
    const record = id ? records.find(item => item.id === id) : null;
    if (method === 'PATCH') {
      assert.ok(record, `Unknown mocked record ${id}`);
      Object.assign(record.fields, body.fields);
      return { ok: true, json: async () => record };
    }
    return { ok: true, json: async () => id ? record : { records } };
  };
  return { calls, state };
}

const storedShift = (fields = {}) => ({ id: 'recShift', fields: {
  User: ['recWorker'], Start: shift.start, End: shift.end, Mode: shift.mode,
  'Break Minutes': shift.breakMinutes, Status: 'Planifié', Revision: 'rev1', ...fields,
} });
const storedRule = () => ({ id: 'recRule', fields: {
  User: ['recWorker'], Weekdays: ['1'], 'Start Time': '09:00', 'End Time': '17:00',
  'Break Minutes': 60, Mode: 'Présentiel', 'Time Zone': 'Africa/Tunis', 'Valid From': '2026-01-01', Active: true,
} });

test('Shift API requires an administrator for reading and mutations', async () => {
  for (const role of ['Editor', 'View']) {
    const { calls } = mockApi({ role });
    for (const body of [undefined, { action: 'save-shift', input: shift }]) {
      const response = res(); await handler(req(body), response, env);
      assert.equal(response.code, 403);
    }
    assert.ok(!calls.some(call => Object.values(SHIFT_TABLES).includes(call.table)));
  }
});

test('Shift list preserves inactive colleagues and history but never returns authentication fields', async () => {
  const { calls } = mockApi({ shifts: [storedShift({ User: ['recInactive'], Status: 'Annulé' })] });
  const response = res(); await handler(req(), response, env);
  assert.equal(response.code, 200, JSON.stringify(response.body));
  assert.deepEqual(response.body.users.find(user => user.id === 'recInactive'), { id: 'recInactive', displayName: 'Former colleague', isActive: false });
  assert.equal(response.body.shifts[0].status, 'Annulé');
  assert.ok(!JSON.stringify(response.body).includes('password_hash'));
  assert.ok(!JSON.stringify(response.body).includes('private'));
  const usersRead = calls.find(call => call.table === USERS_TABLE && !call.id);
  assert.ok(!usersRead.url.includes('password'));
});

test('Shift saves reject conflicts and stale edits, allow adjacency, and reject inactive assignments', async () => {
  const { calls } = mockApi({ shifts: [storedShift()] });
  let response = res(); await handler(req({ action: 'save-shift', input: shift }), response, env);
  assert.equal(response.code, 409);
  response = res(); await handler(req({ action: 'save-shift', id: 'recShift', expected: 'stale', input: shift }), response, env);
  assert.equal(response.code, 409);
  response = res(); await handler(req({ action: 'save-shift', input: { ...shift, userId: 'recInactive' } }), response, env);
  assert.equal(response.code, 400);
  assert.ok(!calls.some(call => ['POST', 'PATCH'].includes(call.method)));
  response = res(); await handler(req({ action: 'save-shift', input: { ...shift, start: shift.end, end: '2026-11-02T18:00:00Z', breakMinutes: 0 } }), response, env);
  assert.equal(response.code, 200, JSON.stringify(response.body));
  assert.ok(calls.some(call => call.method === 'POST' && call.table === SHIFT_TABLES.shifts));
});

test('Absences block conflicting work and cancellations preserve the original historical shift', async () => {
  const { state } = mockApi({ shifts: [storedShift()], absences: [{ id: 'recAbsence', fields: {
    User: ['recWorker'], Start: '2026-11-03T08:00:00Z', End: '2026-11-03T16:00:00Z', Type: 'Congé', Status: 'Planifié', Revision: 'a1',
  } }] });
  let response = res(); await handler(req({ action: 'save-shift', input: { ...shift, start: '2026-11-03T09:00:00Z', end: '2026-11-03T15:00:00Z' } }), response, env);
  assert.equal(response.code, 409);
  response = res(); await handler(req({ action: 'cancel-shift', id: 'recShift', expected: 'rev1' }), response, env);
  assert.equal(response.code, 200);
  const record = state[SHIFT_TABLES.shifts][0];
  assert.equal(record.fields.Status, 'Annulé');
  assert.equal(record.fields.Start, shift.start);
  assert.deepEqual(record.fields.User, ['recWorker']);
});

test('recurrence generation is repeatable without duplicates and canceled source keys stay consumed', async () => {
  const { state } = mockApi({ rules: [storedRule()] });
  const body = { action: 'generate', start: '2026-11-02', end: '2026-11-03' };
  let response = res(); await handler(req(body), response, env);
  assert.equal(response.code, 200, JSON.stringify(response.body));
  assert.equal(response.body.created, 1);
  const generated = state[SHIFT_TABLES.shifts][0];
  response = res(); await handler(req({ action: 'cancel-shift', id: generated.id, expected: generated.fields.Revision }), response, env);
  assert.equal(response.code, 200);
  response = res(); await handler(req(body), response, env);
  assert.equal(response.code, 200);
  assert.equal(response.body.created, 0);
  assert.equal(response.body.skipped, 1);
  assert.equal(state[SHIFT_TABLES.shifts].length, 1);
});

test('week duplication preserves local hours across DST and retries do not create duplicates', async () => {
  const { state } = mockApi({ shifts: [storedShift({ Start: '2026-03-23T08:00:00Z', End: '2026-03-23T16:00:00Z' })] });
  const body = { action: 'duplicate-week', sourceStart: '2026-03-23', targetStart: '2026-03-30', timeZone: 'Europe/Rome' };
  let response = res(); await handler(req(body), response, env);
  assert.equal(response.code, 200, JSON.stringify(response.body));
  assert.equal(response.body.created, 1);
  const copied = state[SHIFT_TABLES.shifts][1];
  assert.equal(copied.fields.Start, '2026-03-30T07:00:00.000Z');
  assert.equal(copied.fields.End, '2026-03-30T15:00:00.000Z');
  response = res(); await handler(req(body), response, env);
  assert.equal(response.code, 200);
  assert.equal(response.body.created, 0);
  assert.equal(response.body.skipped, 1);
  assert.equal(state[SHIFT_TABLES.shifts].length, 2);
});

test('conflicting recurring rules are rejected before any generated occurrence is written', async () => {
  const first = storedRule(), second = { ...storedRule(), id: 'recOtherRule' };
  const { calls } = mockApi({ rules: [first, second] });
  const response = res(); await handler(req({ action: 'generate', start: '2026-11-02', end: '2026-11-03' }), response, env);
  assert.equal(response.code, 409);
  assert.ok(!calls.some(call => call.method === 'POST'));
});
