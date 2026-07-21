// Vercel serverless proxy for Airtable (production).
// Requests to /api/airtable/* are rewritten (see vercel.json) to this function
// with the Airtable path captured in the `__p` query param. All other query
// params are the real Airtable query (fields[], pageSize, offset, ...).
// The Authorization header is injected server-side so the token never reaches
// the browser. Configure AIRTABLE_API_KEY in the Vercel project env variables.

const AIRTABLE_BASE = 'https://api.airtable.com/v0';

export default async function handler(req, res) {
  const token = process.env.AIRTABLE_API_KEY;
  if (!token) {
    res
      .status(500)
      .json({ error: { message: 'AIRTABLE_API_KEY is not configured' } });
    return;
  }

  const url = new URL(req.url, 'http://internal');
  const path = url.searchParams.get('__p') || '';
  url.searchParams.delete('__p');
  const qs = url.searchParams.toString();

  const target = `${AIRTABLE_BASE}/${path}${qs ? `?${qs}` : ''}`;

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
    res.setHeader('cache-control', 'no-store');
    res.send(body);
  } catch (err) {
    res
      .status(502)
      .json({ error: { message: `Proxy error: ${String(err)}` } });
  }
}
