import { airtable, SESSIONS_TABLE, checkOrigin, requireUser, setSessionCookie, sendAuthError } from '../_lib/auth.js';
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    checkOrigin(req, env);
    try {
      const { sessionId } = await requireUser(req, env);
      await airtable(`${SESSIONS_TABLE}/${sessionId}`, { method: 'DELETE', env });
    } catch (error) { if (error.status !== 401) throw error; }
    setSessionCookie(req, res, null, env);
    res.json({ success: true });
  } catch (error) { sendAuthError(res, error); }
}
