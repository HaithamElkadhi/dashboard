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

// [{ filename, content }] where content is base64 (optionally a data: URI) —
// used to attach generated PDFs (Finance → Facture / Reçu).
function parseAttachments(value) {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((a) => a && typeof a.content === 'string' && a.content.trim())
    .map((a) => ({
      filename: String(a.filename || 'attachment.pdf').trim() || 'attachment.pdf',
      content: Buffer.from(a.content.replace(/^data:[^;]+;[^,]*,/, ''), 'base64'),
    }));
  return list.length ? list : undefined;
}

// Returns { status, body } — caller just writes both to its response.
export async function sendProposalEmail(
  { toName, toEmail, cc, subject, body, fromKey, attachments },
  env = process.env
) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: 'RESEND_API_KEY is not configured' } };
  }
  if (!toName?.trim() || !toEmail?.trim()) {
    return { status: 400, body: { error: 'Full name and email are required' } };
  }

  const resend = new Resend(apiKey);
  // `fromKey: 'contact'` uses RESEND_FROM_CONTACT (booking emails);
  // otherwise RESEND_FROM (proposals / default).
  const from =
    fromKey === 'contact'
      ? env.RESEND_FROM_CONTACT || env.RESEND_FROM || 'onboarding@resend.dev'
      : env.RESEND_FROM || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: toEmail.trim(),
      cc: parseEmails(cc).length ? parseEmails(cc) : undefined,
      subject: subject?.trim() || '(No subject)',
      html: buildHtml(body),
      attachments: parseAttachments(attachments),
    });

    if (error) {
      return { status: 400, body: { error: error.message || 'Failed to send email' } };
    }
    return { status: 200, body: { success: true, id: data?.id } };
  } catch (err) {
    return { status: 500, body: { error: `Failed to send email: ${String(err)}` } };
  }
}
