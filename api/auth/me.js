import { requireUser, sendAuthError } from '../_lib/auth.js';
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try { const { user } = await requireUser(req, env); res.json({ user }); } catch (error) { sendAuthError(res, error); }
}
