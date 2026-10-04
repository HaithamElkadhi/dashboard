import { login, sendAuthError } from '../_lib/auth.js';
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await login(req, res, env); } catch (error) { sendAuthError(res, error); }
}
