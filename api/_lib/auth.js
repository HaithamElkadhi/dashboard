import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const AUTH_BASE = 'appVHjUwJBU3wGrOW';
export const USERS_TABLE = 'tblYzfwb0CBFXOFsz';
export const SESSIONS_TABLE = 'tblJ85bJE0loqwNvU';
const COOKIE = 'jeexpert_session';
const HOURS = 12;
export const digest = (value) => createHash('sha256').update(value).digest('hex');
let requestQueue = Promise.resolve();
const pendingSessions = new Map();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export function authError(status, message) { return Object.assign(new Error(message), { status }); }
export function publicUser(record) {
  const role = record.fields.role || (record.fields.is_admin === true ? 'Admin' : 'Editor');
  return {
    id: record.id,
    username: record.fields.username,
    displayName: record.fields.display_name || record.fields.username,
    isActive: record.fields.is_active === true,
    role,
    canWrite: role === 'Admin' || role === 'Editor',
    isAdmin: role === 'Admin',
  };
}
async function airtableRequest(path, { method = 'GET', body, env = process.env } = {}) {
  const token = env.AIRTABLE_AUTH_TOKEN || env.AIRTABLE_API_KEY;
  if (!token) throw authError(503, 'Authentification non configurée.');
  const request = () => fetch(`https://api.airtable.com/v0/${AUTH_BASE}/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
  });
  let response = await request();
  if (response.status === 429) {
    await delay(30000);
    response = await request();
  }
  if (!response.ok) throw authError(503, 'Airtable indisponible. Réessayez plus tard.');
  return response.json();
}
export function airtable(path, options) {
  const result = requestQueue.then(() => airtableRequest(path, options));
  requestQueue = result.catch(() => {}).then(() => delay(225));
  return result;
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$3$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const [algorithm, n, r, p, salt, hex] = String(encoded || '').split('$');
  if (algorithm !== 'scrypt' || n !== '32768' || r !== '8' || p !== '3' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(key, Buffer.from(hex, 'hex'));
}
export function checkOrigin(req, env = process.env) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const allowed = env.APP_ORIGIN ? new URL(env.APP_ORIGIN).origin : `https://${host}`;
  const local = env.NODE_ENV !== 'production' && /^localhost:\d+$/.test(host || '');
  if (!origin || (origin !== allowed && !(local && origin === `http://${host}`))) throw authError(403, 'Origine non autorisée.');
}
function cookieToken(req) {
  const value = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
export function setSessionCookie(req, res, token, env = process.env) {
  const secure = env.NODE_ENV === 'production' || env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token || ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? HOURS * 3600 : 0}${secure}`);
}
export async function requireUser(req, env = process.env) {
  const token = cookieToken(req);
  if (!token) throw authError(401, 'Connexion requise.');
  const key = digest(token);
  const pending = pendingSessions.get(key) || resolveSession(token, env);
  pendingSessions.set(key, pending);
  try {
    const identity = await pending;
    const path = new URL(req.url || '/', 'http://internal').pathname;
    // Login/logout are session operations; all business mutations require write access.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET') && path !== '/api/auth/logout') {
      assertCanWrite(identity.user);
    }
    return identity;
  } finally { pendingSessions.delete(key); }
}
export function assertCanWrite(user) {
  if (!user.canWrite) throw authError(403, 'View access: changes are not allowed.');
}
async function resolveSession(token, env) {
  const params = new URLSearchParams({ filterByFormula: `{token_hash}='${digest(token)}'`, maxRecords: '2' });
  const { records } = await airtable(`${SESSIONS_TABLE}?${params}`, { env });
  if (records.length !== 1 || Date.parse(records[0].fields.expires_at) <= Date.now() || !Number.isFinite(Date.parse(records[0].fields.expires_at))) throw authError(401, 'Session expirée.');
  const links = records[0].fields.user;
  if (!Array.isArray(links) || links.length !== 1) throw authError(401, 'Session invalide.');
  const user = await airtable(`${USERS_TABLE}/${links[0]}`, { env });
  if (!user.fields.is_active) throw authError(401, 'Connexion requise.');
  return { user: publicUser(user), sessionId: records[0].id };
}
export async function requireAdmin(req, env = process.env) {
  const identity = await requireUser(req, env);
  if (!identity.user.isAdmin) throw authError(403, 'Accès réservé aux administrateurs.');
  return identity;
}
export function sendAuthError(res, error) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(error.status || 503).json({ error: error.status ? error.message : 'Service indisponible. Réessayez.' });
}
// Attempts persist in Airtable so different Function instances share them.
// These rows have no user link and are never accepted as sessions.
export async function throttleLogin(req, username, env) {
  const ip = req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const marker = `attempt:${digest(String(ip))}`;
  const account = `attempt-user:${digest(username)}`;
  const cutoff = new Date().toISOString();
  for (const [key, limit] of [[marker, 20], [account, 5]]) {
    const params = new URLSearchParams({ filterByFormula: `AND({token_hash}='${key}',IS_AFTER({expires_at},'${cutoff}'))`, maxRecords: String(limit) });
    const data = await airtable(`${SESSIONS_TABLE}?${params}`, { env });
    if (data.records.length >= limit) throw authError(429, 'Trop de tentatives. Réessayez dans 15 minutes.');
  }
  await airtable(SESSIONS_TABLE, { method: 'POST', env, body: { records: [marker, account].map(token_hash => ({ fields: { token_hash, expires_at: new Date(Date.now() + 15 * 60000).toISOString() } })) } });
}
export async function login(req, res, env = process.env) {
  checkOrigin(req, env);
  const { username: raw, password } = req.body || {};
  const username = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]{1,64}$/.test(username) || typeof password !== 'string' || password.length < 1 || password.length > 256) throw authError(400, 'Identifiants invalides.');
  await throttleLogin(req, username, env);
  const params = new URLSearchParams({ filterByFormula: `{username}='${username}'`, maxRecords: '2' });
  const data = await airtable(`${USERS_TABLE}?${params}`, { env });
  const user = data.records.length === 1 ? data.records[0] : null;
  const dummy = 'scrypt$32768$8$3$00000000000000000000000000000000$' + '00'.repeat(64);
  const valid = await verifyPassword(password, user?.fields.password_hash || dummy);
  if (!valid || !user?.fields.is_active) throw authError(401, 'Identifiant ou mot de passe incorrect.');
  const token = randomBytes(32).toString('hex');
  await airtable(SESSIONS_TABLE, { method: 'POST', env, body: { fields: { token_hash: digest(token), user: [user.id], expires_at: new Date(Date.now() + HOURS * 3600000).toISOString() } } });
  setSessionCookie(req, res, token, env);
  res.json({ user: publicUser(user) });
}
