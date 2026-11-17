import { randomUUID, timingSafeEqual } from 'node:crypto';
import { sendNotification } from 'web-push';
import { BASE_ID, BK, TABLES } from '../../src/lib/config.js';
import { bookingNotifications, REMINDER_LEAD_MS } from '../../src/lib/bookings/notifications.js';
import { airtable, authError, checkOrigin, digest, requireUser, sendAuthError, USERS_TABLE } from './auth.js';

const DEVICES = 'jeexpert:desktop:devices:v1';
const DELETE_DEVICE = "if redis.call('HGET', KEYS[1], ARGV[1]) == ARGV[2] then return redis.call('HDEL', KEYS[1], ARGV[1]) end";
const RELEASE_CLAIM = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end";

function configured(env) {
  return [env.WEB_PUSH_PUBLIC_KEY, env.WEB_PUSH_PRIVATE_KEY, env.WEB_PUSH_SUBJECT,
    env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN, env.DESKTOP_REMINDER_SECRET]
    .every(Boolean);
}

async function redis(env, ...command) {
  const response = await fetch(env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Desktop notification storage unavailable');
  const { result, error } = await response.json();
  if (error) throw new Error('Desktop notification storage command failed');
  return result;
}

function validEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash &&
      (host === 'fcm.googleapis.com' || host.endsWith('.notify.windows.com') ||
        host === 'updates.push.services.mozilla.com');
  } catch { return false; }
}

function validKey(key, length) {
  return typeof key === 'string' && /^[\w-]+$/.test(key) &&
    key.length === Math.ceil(length * 8 / 6) && Buffer.from(key, 'base64url').length === length;
}

async function upcomingBookings(env, now) {
  const request = async (path) => {
    const response = await fetch(`https://api.airtable.com/v0/${path}`, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Booking reminders unavailable');
    return response.json();
  };
  // Airtable formulas require the field name. Read it by ID so renames remain safe.
  const schema = await request(`meta/bases/${BASE_ID}/tables`);
  const name = schema.tables.find((table) => table.id === TABLES.bookings)
    ?.fields.find((field) => field.id === BK.dateTime)?.name;
  if (!name) throw new Error('Booking date field unavailable');
  const date = `{${name}}`;
  const params = new URLSearchParams({
    filterByFormula: `AND(IS_AFTER(${date},DATETIME_PARSE('${new Date(now).toISOString()}')), NOT(IS_AFTER(${date},DATETIME_PARSE('${new Date(now + REMINDER_LEAD_MS).toISOString()}'))))`,
    returnFieldsByFieldId: 'true',
  });
  params.append('fields[]', BK.dateTime);
  params.append('fields[]', BK.bookingStatus);
  const bookings = [];
  do {
    const data = await request(`${BASE_ID}/${TABLES.bookings}?${params}`);
    for (const { id, createdTime, fields } of data.records) {
      const dateTime = fields[BK.dateTime];
      if (Date.parse(dateTime) > now) {
        bookings.push({ id, createdTime, dateTime, bookingStatus: fields[BK.bookingStatus] });
      }
    }
    if (!data.offset) break;
    params.set('offset', data.offset);
  } while (true);
  // Pass one record at a time so the dashboard feed's retention cap cannot hide a due reminder.
  return bookings.flatMap((booking) => bookingNotifications([booking], now)
    .filter((item) => item.kind === 'reminder'));
}

async function activeUsers(env) {
  const params = new URLSearchParams({ filterByFormula: '{is_active}', 'fields[]': 'is_active' });
  const ids = new Set();
  do {
    const data = await airtable(`${USERS_TABLE}?${params}`, { env });
    for (const record of data.records) ids.add(record.id);
    if (!data.offset) return ids;
    params.set('offset', data.offset);
  } while (true);
}

async function deliver(env, reminder, deviceKey, saved, device) {
  const ttl = Math.floor((Date.parse(reminder.dateTime) - Date.now()) / 1000);
  if (ttl <= 0) return false;
  const claimKey = `jeexpert:desktop:sent:${deviceKey}:${reminder.id}`;
  const claim = randomUUID();
  if (await redis(env, 'SET', claimKey, claim, 'NX', 'EX', ttl) !== 'OK') return false;
  try {
    if (await redis(env, 'HGET', DEVICES, deviceKey) !== saved) {
      await redis(env, 'EVAL', RELEASE_CLAIM, 1, claimKey, claim);
      return false;
    }
    const usesWns = new URL(device.subscription.endpoint).hostname.endsWith('.notify.windows.com');
    await sendNotification(device.subscription, JSON.stringify({
      id: reminder.id,
      title: 'Booking starts soon',
      body: 'Open JEEXPERT to see the appointment details.',
      href: `/bookings?booking=${encodeURIComponent(reminder.bookingId)}`,
    }), {
      TTL: Math.max(0, Math.floor((Date.parse(reminder.dateTime) - Date.now()) / 1000)),
      timeout: 8000,
      ...(usesWns ? { headers: { 'X-WNS-Type': 'wns/raw' } } : {}),
      topic: digest(reminder.id).slice(0, 32),
      vapidDetails: { subject: env.WEB_PUSH_SUBJECT, publicKey: env.WEB_PUSH_PUBLIC_KEY, privateKey: env.WEB_PUSH_PRIVATE_KEY },
    });
    return true;
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) {
      await redis(env, 'EVAL', DELETE_DEVICE, 1, DEVICES, deviceKey, saved);
      return false;
    }
    await redis(env, 'EVAL', RELEASE_CLAIM, 1, claimKey, claim);
    throw error;
  }
}

async function dispatch(env) {
  const now = Date.now();
  const entries = await redis(env, 'HGETALL', DEVICES);
  if (!entries?.length) return { sent: 0, failed: 0 };
  const reminders = await upcomingBookings(env, now);
  if (!reminders.length) return { sent: 0, failed: 0 };
  const users = await activeUsers(env);
  const devices = [];
  for (let i = 0; i < entries.length; i += 2) {
    const saved = entries[i + 1];
    const device = JSON.parse(saved);
    if (users.has(device.userId) && validEndpoint(device.subscription.endpoint)) {
      devices.push([entries[i], saved, device]);
    }
  }
  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    for (let i = 0; i < devices.length; i += 10) {
      const results = await Promise.allSettled(devices.slice(i, i + 10)
        .map((device) => deliver(env, reminder, ...device)));
      for (const result of results) {
        if (result.status === 'rejected') failed += 1;
        else if (result.value) sent += 1;
      }
    }
  }
  return { sent, failed };
}

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const action = new URL(req.url, 'http://internal').searchParams.get('action');
    if (action === 'dispatch' && req.method === 'POST') {
      if (!configured(env)) throw authError(503, 'Background reminders are not configured.');
      const received = digest(req.headers.authorization || '');
      const expected = digest(`Bearer ${env.DESKTOP_REMINDER_SECRET}`);
      if (!timingSafeEqual(Buffer.from(received), Buffer.from(expected))) throw authError(401, 'Unauthorized.');
      const result = await dispatch(env);
      return res.status(result.failed ? 503 : 200).json(result);
    }
    const { user } = await requireUser(req, env, { allowOwnDesktopSubscription: true });
    if (req.method === 'GET') return res.json({ publicKey: configured(env) ? env.WEB_PUSH_PUBLIC_KEY : null });
    if (!['POST', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, DELETE');
      throw authError(405, 'Method not allowed.');
    }
    checkOrigin(req, env);
    if (!configured(env)) throw authError(503, 'Background reminders are not configured.');
    const { endpoint, keys } = req.body || {};
    if (!validEndpoint(endpoint)) throw authError(400, 'Invalid push endpoint.');
    const deviceKey = digest(endpoint);
    if (req.method === 'POST') {
      if (!validKey(keys?.p256dh, 65) || !validKey(keys?.auth, 16)) throw authError(400, 'Invalid push keys.');
      const subscription = { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
      await redis(env, 'HSET', DEVICES, deviceKey, JSON.stringify({ userId: user.id, subscription }));
    } else {
      const saved = await redis(env, 'HGET', DEVICES, deviceKey);
      if (saved && JSON.parse(saved).userId === user.id) {
        await redis(env, 'EVAL', DELETE_DEVICE, 1, DEVICES, deviceKey, saved);
      }
    }
    return res.json({ success: true });
  } catch (error) { return sendAuthError(res, error); }
}
