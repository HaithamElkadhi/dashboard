const CACHE = 'jeexpert-offline-v1';
const OFFLINE = '/offline.html';

// Only this public fallback is cached. No authenticated pages, API responses,
// attachments or application data enter Cache Storage.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('jeexpert-offline-') && key !== CACHE)
      .map((key) => caches.delete(key)),
  )));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate'
      || url.origin !== self.location.origin
      || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  event.respondWith(fetch(event.request).catch(async () => {
    const fallback = await caches.match(OFFLINE);
    return fallback || new Response('You are offline. Reconnect and try again.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }));
});
