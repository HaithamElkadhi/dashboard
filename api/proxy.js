// Vercel serverless proxy for Airtable (production).
// Requests to /api/airtable/* are rewritten (see vercel.json) to this function
// with the Airtable path captured in the `__p` query param. All other query
// params are the real Airtable query (fields[], pageSize, offset, ...).
// Use `__host=content` (set by the /api/airtable-content rewrite) for the
// attachment upload host at content.airtable.com.
// The Authorization header is injected server-side so the token never reaches
// the browser. Configure AIRTABLE_API_KEY in the Vercel project env variables.

import { requireUser, checkOrigin, sendAuthError } from './_lib/auth.js';
import { BASE_ID, EXPENSES_BASE_ID, TABLES } from '../src/lib/config.js';
const AIRTABLE_API = 'https://api.airtable.com/v0';
const AIRTABLE_CONTENT = 'https://content.airtable.com/v0';
const ALLOWED = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

export default async function handler(req, res, env = process.env) {
  res.setHeader('cache-control', 'no-store');
  try {
    await requireUser(req, env);
    if (req.method !== 'GET') checkOrigin(req, env);
  } catch (error) { return sendAuthError(res, error); }
  const token = env.AIRTABLE_API_KEY;
  if (!token) {
    res
      .status(500)
      .json({ error: { message: 'AIRTABLE_API_KEY is not configured' } });
    return;
  }

  const method = req.method || 'GET';
  if (!ALLOWED.has(method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    res.status(405).json({ error: { message: `Method ${method} not allowed` } });
    return;
  }

  const url = new URL(req.url, 'http://internal');
  const path = url.searchParams.get('__p') || '';
  const host = url.searchParams.get('__host');
  const parts = path.split('/');
  const schema = method === 'GET' && /^meta\/bases\/(app[A-Za-z0-9]+)\/tables$/.test(path) && [BASE_ID, EXPENSES_BASE_ID].includes(parts[2]);
  const data = host !== 'content' &&
    (parts[0] === BASE_ID ? Object.entries(TABLES).filter(([key]) => key !== 'expenses').map(([, value]) => value).includes(parts[1]) : parts[0] === EXPENSES_BASE_ID && parts[1] === TABLES.expenses) &&
    (parts.length === 2 || (parts.length === 3 && /^rec[A-Za-z0-9]+$/.test(parts[2])));
  const upload = host === 'content' && method === 'POST' && [BASE_ID, EXPENSES_BASE_ID].includes(parts[0]) && parts.length === 4 && /^rec[A-Za-z0-9]+$/.test(parts[1]) && /^fld[A-Za-z0-9]+$/.test(parts[2]) && parts[3] === 'uploadAttachment';
  if ((!schema && !data && !upload) || (host && host !== 'content')) return res.status(403).json({ error: 'Accès non autorisé.' });
  url.searchParams.delete('__p');
  url.searchParams.delete('__host');
  const qs = url.searchParams.toString();

  const base = host === 'content' ? AIRTABLE_CONTENT : AIRTABLE_API;
  const target = `${base}/${path}${qs ? `?${qs}` : ''}`;

  const headers = { Authorization: `Bearer ${token}` };
  const init = { method, headers };

  if (method === 'POST' || method === 'PATCH') {
    headers['Content-Type'] = 'application/json';
    const body = req.body;
    init.body =
      body == null || body === ''
        ? undefined
        : typeof body === 'string'
          ? body
          : JSON.stringify(body);
  }

  try {
    init.signal = AbortSignal.timeout(30000);
    const airtableRes = await fetch(target, init);
    const body = await airtableRes.text();
    res.status(airtableRes.status);
    res.setHeader(
      'content-type',
      airtableRes.headers.get('content-type') || 'application/json'
    );
    res.setHeader('cache-control', 'no-store');
    res.send(body);
  } catch (err) {
    res
      .status(502)
      .json({ error: { message: `Proxy error: ${String(err)}` } });
  }
}
