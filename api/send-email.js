// Vercel serverless function for sending proposal emails (Operations tools).
// Requires RESEND_API_KEY (and optionally RESEND_FROM) in the Vercel project
// env variables — see README.md. The same logic runs locally under
// `npm run dev` via the Vite middleware in vite.config.js.

import { sendProposalEmail } from './_lib/sendEmail.js';
import { requireUser, checkOrigin, sendAuthError } from './_lib/auth.js';
import { BASE_ID } from '../src/lib/config.js';
import { EMAIL_HISTORY_TABLE } from '../src/lib/contactActivity.js';

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let user;
  try { checkOrigin(req, env); ({ user } = await requireUser(req, env)); }
  catch (error) { return sendAuthError(res, error); }
  const { status, body } = await sendProposalEmail(req.body || {}, env);
  if (body.success) {
    try {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${EMAIL_HISTORY_TABLE}`, { method: 'POST', headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { 'Provider ID': body.id || '', Recipient: req.body.toEmail.trim(), Subject: req.body.subject?.trim() || '(No subject)', 'Sent At': new Date().toISOString(), Actor: `${user.displayName || user.username} (${user.username})` } }), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('History failed');
    } catch { body.warning = 'Email sent, but contact history could not be recorded. Do not resend the email.'; }
  }
  res.status(status).json(body);
}
