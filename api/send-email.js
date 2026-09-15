// Vercel serverless function for sending proposal emails (Operations tools).
// Requires RESEND_API_KEY (and optionally RESEND_FROM) in the Vercel project
// env variables — see README.md. The same logic runs locally under
// `npm run dev` via the Vite middleware in vite.config.js.

import { sendProposalEmail } from './_lib/sendEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { status, body } = await sendProposalEmail(req.body || {});
  res.status(status).json(body);
}
