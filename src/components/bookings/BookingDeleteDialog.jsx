import { useState } from 'react';
import Modal from '../Modal.jsx';
import { formatDateTime } from '../../lib/format.js';

export default function BookingDeleteDialog({ booking, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      // Parent shows toast and closes.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="Supprimer ce booking ?"
      subtitle="Cette action est définitive."
      onClose={deleting ? () => {} : onClose}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-text-muted">
        {booking?.studentName
          ? `Tu es sur le point de supprimer le booking de « ${booking.studentName} » (${formatDateTime(booking.dateTime)}).`
          : 'Tu es sur le point de supprimer définitivement ce booking.'}
      </p>
    </Modal>
  );
}
