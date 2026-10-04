// Vercel serverless function for sending proposal emails (Operations tools).
// Requires RESEND_API_KEY (and optionally RESEND_FROM) in the Vercel project
// env variables — see README.md. The same logic runs locally under
// `npm run dev` via the Vite middleware in vite.config.js.

import { sendProposalEmail } from './_lib/sendEmail.js';
import { requireUser, checkOrigin, sendAuthError } from './_lib/auth.js';

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try { checkOrigin(req, env); await requireUser(req, env); }
  catch (error) { return sendAuthError(res, error); }
  const { status, body } = await sendProposalEmail(req.body || {}, env);
  res.status(status).json(body);
}
