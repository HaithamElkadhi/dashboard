import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/_lib/courses.js';
import { PF } from '../src/lib/config.js';

const courseId = 'recAAAAAAAAAAAAAA';
const studentId = 'recBBBBBBBBBBBBBB';
const requestId = '3e0ec400-cc6a-4f59-8283-a38cf9558b75';
const env = { AIRTABLE_API_KEY: 'test', RESEND_API_KEY: 'test', RESEND_FROM: 'team@example.com', APP_ORIGIN: 'https://dashboard.example' };

test('uses the portal catalog and emails selected IDs to either recipient type with write authorization', async t => {
  const course = Array(24).fill(null);
  Object.assign(course, { 0: courseId, 2: 'Mathematics', 3: 'University of Example', 5: 'Magistrale', 6: 'EN', 18: 'https://example.edu/course' });
  const calls = [];
  let role = 'Editor';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const address = String(url);
    if (address.includes('/tblJ85bJE0loqwNvU?')) {
      return Response.json({ records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] });
    }
    if (address.endsWith('/recUser')) return Response.json({ id: 'recUser', fields: { username: 'operator', role, is_active: true } });
    if (address.includes(`/${studentId}?`)) return Response.json({ fields: { [PF.fullName]: 'Ada', [PF.email]: 'ada@example.com' } });
    if (address === 'https://student.jeexpert.com/course-finder/catalog.json') return Response.json([course]);
    if (address === 'https://api.resend.com/emails') {
      calls.push({ headers: new Headers(options.headers), payload: JSON.parse(options.body) });
      return Response.json({ id: 'resend-id' });
    }
    assert.fail(`Unexpected request to ${address}`);
  });

  const run = async (method, body) => {
    const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; } };
    await handler({ method, url: '/api/courses', headers: { origin: env.APP_ORIGIN, cookie: `jeexpert_session=${'ab'.repeat(32)}` }, body }, res, env);
    return res;
  };

  const list = await run('GET');
  assert.deepEqual(list.body.courses, [course]);
  const input = { courseIds: [courseId], requestId };
  assert.equal((await run('POST', { ...input, studentId })).body.recipient, 'ada@example.com');
  assert.equal((await run('POST', { ...input, requestId: '12f18eb3-95b9-4bd4-b8a6-3d6d89b1df23', email: 'manual@example.com' })).body.recipient, 'manual@example.com');
  assert.deepEqual(calls.map(call => call.payload.to), ['ada@example.com', 'manual@example.com']);
  assert.match(calls[0].payload.text, /Bonjour Ada,[\s\S]*Mathematics[\s\S]*https:\/\/example.edu\/course/);
  assert.equal(calls[0].payload.html, undefined);
  assert.equal(calls[0].headers.get('Idempotency-Key'), `courses-recUser-${requestId}`);
  assert.notEqual(calls[0].headers.get('Idempotency-Key'), calls[1].headers.get('Idempotency-Key'));
  assert.equal((await run('POST', { ...input, studentId, email: 'manual@example.com' })).code, 400);
  assert.equal((await run('POST', { ...input, email: 'manual@example.com', courseIds: ['recCCCCCCCCCCCCCC'] })).code, 409);
  role = 'View';
  assert.equal((await run('POST', { ...input, studentId })).code, 403);
  assert.equal(calls.length, 2);
});
