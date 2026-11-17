import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import https from 'node:https';
import test from 'node:test';
import { generateVAPIDKeys } from 'web-push';
import handler from '../api/operations.js';
import { BK, TABLES } from '../src/lib/config.js';
import { USERS_TABLE } from '../api/_lib/auth.js';

test('authorized scheduler sends one encrypted reminder for an upcoming active booking', async (t) => {
  const vapid = generateVAPIDKeys();
  const browser = generateVAPIDKeys();
  const env = {
    WEB_PUSH_PUBLIC_KEY: vapid.publicKey,
    WEB_PUSH_PRIVATE_KEY: vapid.privateKey,
    WEB_PUSH_SUBJECT: 'mailto:notifications@example.com',
    UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
    UPSTASH_REDIS_REST_TOKEN: 'redis-secret',
    DESKTOP_REMINDER_SECRET: 'scheduler-secret',
    AIRTABLE_API_KEY: 'airtable-secret',
  };
  const saved = JSON.stringify({ userId: 'recActive', subscription: {
    endpoint: 'https://wns2-par02p.notify.windows.com/w/valid',
    keys: { p256dh: browser.publicKey, auth: randomBytes(16).toString('base64url') },
  } });
  const claims = new Set();
  const upcoming = new Date(Date.now() + 20 * 60000).toISOString();
  const expired = new Date(Date.now() - 60000).toISOString();
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(input);
    if (url.origin === env.UPSTASH_REDIS_REST_URL) {
      const [command, key] = JSON.parse(init.body);
      if (command === 'HGETALL') return Response.json({ result: ['device', saved] });
      if (command === 'HGET') return Response.json({ result: saved });
      assert.equal(command, 'SET');
      if (claims.has(key)) return Response.json({ result: null });
      claims.add(key);
      return Response.json({ result: 'OK' });
    }
    assert.equal(url.hostname, 'api.airtable.com');
    if (url.pathname.includes('/meta/')) return Response.json({
      tables: [{ id: TABLES.bookings, fields: [{ id: BK.dateTime, name: 'Meeting Date' }] }],
    });
    if (url.pathname.endsWith(TABLES.bookings)) {
      assert.match(url.searchParams.get('filterByFormula'), /\{Meeting Date\}/);
      return Response.json({ records: [
        { id: 'recDue', fields: { [BK.dateTime]: upcoming } },
        { id: 'recCancelled', fields: { [BK.dateTime]: upcoming, [BK.bookingStatus]: 'Cancelled' } },
        { id: 'recExpired', fields: { [BK.dateTime]: expired } },
      ] });
    }
    assert.ok(url.pathname.endsWith(USERS_TABLE));
    return Response.json({ records: [{ id: 'recActive' }] });
  });
  const requests = t.mock.method(https, 'request', (options, onResponse) => {
    assert.equal(options.hostname, 'wns2-par02p.notify.windows.com');
    assert.equal(options.headers['Content-Encoding'], 'aes128gcm');
    assert.equal(options.headers['X-WNS-Type'], 'wns/raw');
    const request = new EventEmitter();
    request.write = (buffer) => assert.ok(Buffer.isBuffer(buffer) && buffer.length > 0);
    request.end = () => {
      const response = Object.assign(new EventEmitter(), { statusCode: 201 });
      onResponse(response);
      response.emit('end');
    };
    return request;
  });
  async function invoke(authorization) {
    const res = {
      code: 200,
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; },
    };
    await handler({
      url: '/api/operations?__route=desktop-notifications&action=dispatch',
      method: 'POST',
      headers: { authorization },
    }, res, env);
    return res;
  }
  assert.equal((await invoke('Bearer wrong')).code, 401);
  assert.deepEqual((await invoke('Bearer scheduler-secret')).body, { sent: 1, failed: 0 });
  assert.deepEqual((await invoke('Bearer scheduler-secret')).body, { sent: 0, failed: 0 });
  assert.equal(requests.mock.callCount(), 1);
});
