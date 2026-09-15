import { useState } from 'react';
import Modal from '../Modal.jsx';
import { formatDateTime } from '../../lib/format.js';

export default function BookingCancelDialog({ booking, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm();
    } catch {
      // Parent shows toast and closes.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Annuler ce booking ?"
      subtitle="Le statut passera à Cancelled."
      onClose={saving ? () => {} : onClose}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? 'Annulation…' : 'Confirmer l’annulation'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-text-muted">
        {booking?.studentName
          ? `Annuler le booking de « ${booking.studentName} » prévu le ${formatDateTime(booking.dateTime)} ?`
          : 'Confirmer l’annulation de ce booking ?'}
      </p>
    </Modal>
  );
}
