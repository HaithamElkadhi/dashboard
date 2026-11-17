const ENDPOINT = '/api/desktop-notifications';
const PREFERENCE = 'jeexpert:desktop-notifications';
const ICON = '/images/jeexpert/pwa-192.png';

export function supportsDesktopNotifications() {
  return import.meta.env.PROD && 'Notification' in window && 'serviceWorker' in navigator;
}

export function desktopNotificationMode(owner) {
  try {
    const preference = JSON.parse(localStorage.getItem(PREFERENCE));
    return window.Notification?.permission === 'granted' && preference?.owner === owner
      ? preference.mode : null;
  } catch {
    return null;
  }
}

function savePreference(owner, mode) {
  localStorage.setItem(PREFERENCE, JSON.stringify({ owner, mode }));
  window.dispatchEvent(new Event('desktop-notifications-changed'));
}

async function requestConfiguration(method = 'GET', body) {
  const response = await fetch(ENDPOINT, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('Could not update desktop notifications. Please try again.');
  return method === 'GET' ? response.json() : undefined;
}

function decodePublicKey(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function enableDesktopNotifications(owner) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Allow notifications in your browser settings and try again.'
      : 'Allow notifications to receive booking reminders on this device.');
  }

  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration?.active) throw new Error('Reload JEEXPERT and try again.');
  const { publicKey } = await requestConfiguration();
  if (!publicKey || !registration.pushManager) {
    savePreference(owner, 'local');
    return;
  }

  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodePublicKey(publicKey),
    });
  try {
    await requestConfiguration('POST', subscription.toJSON());
    savePreference(owner, 'push');
  } catch (error) {
    await subscription.unsubscribe().catch(() => {});
    throw error;
  }
}

export async function disableDesktopNotifications({ forgetOnServer = true } = {}) {
  try { localStorage.removeItem(PREFERENCE); } catch { /* Storage can be disabled. */ }
  window.dispatchEvent(new Event('desktop-notifications-changed'));
  const registration = await navigator.serviceWorker?.getRegistration('/');
  if (!registration) return;
  const subscription = await registration.pushManager?.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
  const notifications = await registration.getNotifications();
  notifications.forEach((notification) => {
    if (notification.tag.startsWith('jeexpert:')) notification.close();
  });
  if (subscription && forgetOnServer) await requestConfiguration('DELETE', { endpoint: subscription.endpoint });
}

export function updateDesktopBadge(count) {
  const update = count ? navigator.setAppBadge?.(count) : navigator.clearAppBadge?.();
  update?.catch(() => {});
}

export async function showBookingReminder(item) {
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration?.active) throw new Error('Desktop notifications require an active service worker.');
  await registration.showNotification('JEEXPERT · Booking reminder', {
    body: 'An appointment starts soon. Open JEEXPERT to view the booking.',
    icon: ICON,
    tag: `jeexpert:${item.id}`,
    data: { href: item.href },
  });
}
