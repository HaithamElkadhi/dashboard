import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker(fetch, overrides = {}) {
  const handlers = {};
  const cached = [];
  const fallback = new Response('Offline');
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://jeexpert.example' }, addEventListener: (name, handler) => { handlers[name] = handler; }, ...overrides },
    caches: { open: async () => ({ add: async (path) => cached.push(path) }), match: async () => fallback },
    URL, Response, fetch,
  });
  return { handlers, cached, fallback };
}

test('PWA only precaches its public offline fallback', async () => {
  const { handlers, cached } = worker();
  let pending;
  handlers.install({ waitUntil: (promise) => { pending = promise; } });
  await pending;
  assert.deepEqual(cached, ['/offline.html']);
});

test('API, attachments and mutations bypass the worker', () => {
  const { handlers } = worker(() => { throw new Error('Must bypass'); });
  for (const [url, mode, method] of [
    ['https://jeexpert.example/api/student-documents', 'navigate', 'GET'],
    ['https://jeexpert.example/api', 'navigate', 'GET'],
    ['https://jeexpert.example/api/ticketing', 'cors', 'POST'],
    ['https://airtable.example/file.pdf', 'navigate', 'GET'],
    ['https://jeexpert.example/assets/main.js', 'cors', 'GET'],
  ]) {
    handlers.fetch({ request: { url, mode, method }, respondWith: () => assert.fail('Intercepted private/non-navigation request') });
  }
});

test('Offline navigation returns fallback without caching student pages', async () => {
  const { handlers, fallback, cached } = worker(async () => { throw new Error('Offline'); });
  let pending;
  handlers.fetch({ request: { url: 'https://jeexpert.example/students/rec123/documents', mode: 'navigate', method: 'GET' }, respondWith: (promise) => { pending = promise; } });
  assert.equal(await pending, fallback);
  assert.deepEqual(cached, []);
});

test('Online navigation preserves the current server response', async () => {
  const response = new Response('Current dashboard');
  const { handlers } = worker(async () => response);
  let pending;
  handlers.fetch({ request: { url: 'https://jeexpert.example/', mode: 'navigate', method: 'GET' }, respondWith: (promise) => { pending = promise; } });
  assert.equal(await pending, response);
});

test('Manifest has correctly sized installation icons', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((item) => item.sizes === `${size}x${size}`);
    const png = readFileSync(`public${icon.src}`);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('A background booking push shows a Windows notification and its click opens the booking', async () => {
  let shown;
  let opened;
  let closed = false;
  let windows = [];
  const badgeCalls = [];
  const { handlers } = worker(undefined, {
    registration: { showNotification: async (title, options) => { shown = { title, ...options }; } },
    navigator: { setAppBadge: async (...args) => { badgeCalls.push(args); } },
    clients: { matchAll: async () => windows, openWindow: async (url) => { opened = url; } },
  });
  const pending = [];
  const push = () => handlers.push({
    data: { json: () => ({ id: 'booking:reminder:rec123', title: 'Booking reminder', href: '/bookings?booking=rec123' }) },
    waitUntil: (promise) => pending.push(promise),
  });
  push();
  await Promise.all(pending);
  assert.equal(shown.title, 'Booking reminder');
  assert.deepEqual(badgeCalls, [[]]);
  windows = [{ url: 'https://jeexpert.example/' }];
  push();
  await Promise.all(pending);
  assert.deepEqual(badgeCalls, [[]]);
  handlers.notificationclick({
    notification: { ...shown, close: () => { closed = true; } },
    waitUntil: (promise) => pending.push(promise),
  });
  await Promise.all(pending);
  assert.equal(closed, true);
  assert.equal(opened, 'https://jeexpert.example/bookings?booking=rec123');
});

test('A notification click with an external destination stays in JEEXPERT', async () => {
  let opened;
  let pending;
  const { handlers } = worker(undefined, {
    clients: { matchAll: async () => [], openWindow: async (url) => { opened = url; } },
  });
  handlers.notificationclick({
    notification: { tag: 'jeexpert:test', data: { href: 'https://external.example/bookings' }, close() {} },
    waitUntil: (promise) => { pending = promise; },
  });
  await pending;
  assert.equal(opened, 'https://jeexpert.example/bookings');
});
