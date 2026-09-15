import { useState } from 'react';
import Modal from '../Modal.jsx';
import { buildBookingEmail } from '../../lib/bookings/emailTemplates.js';

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

export default function BookingEmailPreviewModal({
  booking,
  kind,
  onClose,
  onSent,
}) {
  const draft = buildBookingEmail(booking, kind);
  const [toName, setToName] = useState(booking.studentName || '');
  const [toEmail, setToEmail] = useState(booking.email || '');
  const [subject, setSubject] = useState(draft.subject);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const title =
    kind === 'meeting-link' ? 'Send meeting link' : 'Send rappel';

  const handleSend = async () => {
    if (!toName.trim() || !toEmail.trim()) {
      setError('Nom et email du destinataire sont requis.');
      return;
    }
    if (kind === 'meeting-link' && !(booking.meetingLink || '').trim()) {
      setError('Ce booking n’a pas de lien meeting.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toName: toName.trim(),
          toEmail: toEmail.trim(),
          subject: subject.trim(),
          body: draft.html,
          fromKey: 'contact',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Échec de l’envoi');
        return;
      }
      onSent?.();
      onClose();
    } catch {
      setError('Échec de l’envoi. Réessaie.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={title}
      subtitle="Aperçu avant envoi"
      onClose={sending ? () => {} : onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">Destinataire</span>
            <input
              className={inputClass}
              value={toName}
              onChange={(e) => setToName(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">Email</span>
            <input
              type="email"
              className={inputClass}
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-strong">Objet</span>
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-strong">Aperçu</p>
          <div className="overflow-hidden rounded-xl border border-border bg-canvas">
            <iframe
              title="Aperçu email"
              srcDoc={draft.html}
              className="h-72 w-full bg-white"
              sandbox=""
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
