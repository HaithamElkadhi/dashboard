import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker(fetch) {
  const handlers = {};
  const cached = [];
  const fallback = new Response('Offline');
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://jeexpert.example' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
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
