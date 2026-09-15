import { formatDateTime } from '../format.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapEmail({ greeting, paragraphs, cta }) {
  const paras = paragraphs
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1d1f25;">${p}</p>`
    )
    .join('');

  const button = cta?.href
    ? `<p style="margin:24px 0;">
        <a href="${escapeHtml(cta.href)}"
           style="display:inline-block;background:#185FA5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
          ${escapeHtml(cta.label || 'Ouvrir')}
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:13px;color:#5f5e5a;word-break:break-all;">
        ${escapeHtml(cta.href)}
      </p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#f7f7f5;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e2;border-radius:12px;padding:28px;">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1d1f25;">
      ${escapeHtml(greeting)}
    </p>
    ${paras}
    ${button}
    <p style="margin:28px 0 0;font-size:15px;line-height:1.55;color:#1d1f25;">
      Cordialement,<br/>
      <strong>L’équipe Jeexpert</strong>
    </p>
  </div>
</body>
</html>`.trim();
}

function studentFirstName(booking) {
  const name = (booking.studentName || '').trim();
  if (!name) return '';
  return name.split(/\s+/)[0];
}

/** Build subject + HTML for booking emails. kind: 'meeting-link' | 'rappel' */
export function buildBookingEmail(booking, kind) {
  const first = studentFirstName(booking);
  const greeting = first ? `Bonjour ${first},` : 'Bonjour,';
  const when = formatDateTime(booking.dateTime);
  const type = booking.meetingType || 'consultation';
  const link = (booking.meetingLink || '').trim();

  if (kind === 'meeting-link') {
    return {
      subject: `Lien de votre meeting Jeexpert — ${when}`,
      html: wrapEmail({
        greeting,
        paragraphs: [
          `Voici le lien pour rejoindre votre <strong>${escapeHtml(type)}</strong> prévue le <strong>${escapeHtml(when)}</strong>.`,
          link
            ? 'Cliquez sur le bouton ci-dessous pour ouvrir la réunion :'
            : '<span style="color:#a32d2d;">Aucun lien de meeting n’est encore renseigné pour ce booking.</span>',
        ],
        cta: link ? { href: link, label: 'Rejoindre le meeting' } : null,
      }),
    };
  }

  // rappel
  return {
    subject: `Rappel — votre consultation Jeexpert le ${when}`,
    html: wrapEmail({
      greeting,
      paragraphs: [
        `Petit rappel : votre <strong>${escapeHtml(type)}</strong> avec Jeexpert est prévue le <strong>${escapeHtml(when)}</strong>.`,
        link
          ? 'Vous pourrez rejoindre la réunion via le lien ci-dessous :'
          : 'Nous vous enverrons le lien de meeting avant le rendez-vous si ce n’est pas déjà fait.',
      ],
      cta: link ? { href: link, label: 'Rejoindre le meeting' } : null,
    }),
  };
}

export const BOOKING_EMAIL_KINDS = [
  {
    id: 'meeting-link',
    label: 'Send meeting link',
    description: 'Envoyer le lien de la réunion',
  },
  {
    id: 'rappel',
    label: 'Send rappel',
    description: 'Envoyer un rappel du rendez-vous',
  },
];
