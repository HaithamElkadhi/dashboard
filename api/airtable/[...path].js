// Vercel serverless proxy for Airtable.
// In production the Vite dev proxy does not exist, so this function handles all
// `/api/airtable/*` requests, forwarding them to the Airtable REST API and
// injecting the Authorization header server-side (the token never reaches the
// browser). Configure AIRTABLE_API_KEY in the Vercel project env variables.

const AIRTABLE_BASE = 'https://api.airtable.com/v0';
const PREFIX = '/api/airtable';

export default async function handler(req, res) {
  const token = process.env.AIRTABLE_API_KEY;
  if (!token) {
    res
      .status(500)
      .json({ error: { message: 'AIRTABLE_API_KEY is not configured' } });
    return;
  }

  // Preserve the full path + query string (including repeated fields[] params).
  let suffix = req.url || '';
  const idx = suffix.indexOf(PREFIX);
  if (idx !== -1) suffix = suffix.slice(idx + PREFIX.length);
  if (!suffix.startsWith('/')) suffix = `/${suffix}`;

  const target = `${AIRTABLE_BASE}${suffix}`;

  try {
    const airtableRes = await fetch(target, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await airtableRes.text();
    res.status(airtableRes.status);
    res.setHeader(
      'content-type',
      airtableRes.headers.get('content-type') || 'application/json'
    );
    // Small cache to soften repeated manual refreshes; adjust as needed.
    res.setHeader('cache-control', 'no-store');
    res.send(body);
  } catch (err) {
    res
      .status(502)
      .json({ error: { message: `Proxy error: ${String(err)}` } });
  }
}
