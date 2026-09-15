// Shared by the Vercel function (api/send-email.js) and the Vite dev-server
// middleware (vite.config.js), so "Send email" works identically under
// `npm run dev` and in production without duplicating the Resend call.
import { Resend } from 'resend';

function parseEmails(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function buildHtml(rawBody) {
  const trimmed = (rawBody || '').trim();
  if (!trimmed) return '<p></p>';
  if (trimmed.startsWith('<')) return trimmed;
  return trimmed
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

// Returns { status, body } — caller just writes both to its response.
export async function sendProposalEmail({ toName, toEmail, cc, subject, body }, env = process.env) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: 'RESEND_API_KEY is not configured' } };
  }
  if (!toName?.trim() || !toEmail?.trim()) {
    return { status: 400, body: { error: 'Full name and email are required' } };
  }

  const resend = new Resend(apiKey);
  const from = env.RESEND_FROM || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: toEmail.trim(),
      cc: parseEmails(cc).length ? parseEmails(cc) : undefined,
      subject: subject?.trim() || '(No subject)',
      html: buildHtml(body),
    });

    if (error) {
      return { status: 400, body: { error: error.message || 'Failed to send email' } };
    }
    return { status: 200, body: { success: true, id: data?.id } };
  } catch (err) {
    return { status: 500, body: { error: `Failed to send email: ${String(err)}` } };
  }
}
