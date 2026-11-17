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

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let reminder;
  try {
    reminder = event.data.json();
  } catch {
    return;
  }
  if (typeof reminder?.id !== 'string' || typeof reminder.title !== 'string') return;
  event.waitUntil(self.registration.showNotification(reminder.title, {
    body: typeof reminder.body === 'string' ? reminder.body : '',
    icon: '/images/jeexpert/pwa-192.png',
    tag: `jeexpert:${reminder.id}`,
    data: { href: reminder.href },
  }));
  if (self.navigator.setAppBadge) {
    event.waitUntil((async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // An open dashboard owns the exact unread count.
      if (!windows.length) await self.navigator.setAppBadge();
    })().catch(() => {}));
  }
});

self.addEventListener('notificationclick', (event) => {
  if (!event.notification.tag.startsWith('jeexpert:')) return;
  event.notification.close();
  event.waitUntil((async () => {
    let url = new URL('/bookings', self.location.origin);
    try {
      const destination = new URL(event.notification.data?.href, self.location.origin);
      if (destination.origin === url.origin && destination.pathname === '/bookings') url = destination;
    } catch { /* Fall back to the bookings page. */ }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url === url.href);
    if (existing) await existing.focus();
    else await self.clients.openWindow(url.href);
  })());
});
