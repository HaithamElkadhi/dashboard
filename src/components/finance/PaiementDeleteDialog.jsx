import { useState } from 'react';
import Modal from '../Modal.jsx';
import { formatMoney } from '../../lib/format.js';

export default function PaiementDeleteDialog({ paiement, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      // Parent shows the toast and closes the dialog on failure.
    } finally {
      setDeleting(false);
    }
  };

  const label = [
    paiement?.reference,
    paiement?.fullName,
    paiement?.amount ? formatMoney(paiement.amount, paiement.currency) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      title="Supprimer ce paiement ?"
      subtitle="Il sera supprimé d'Airtable. Cette action est irréversible."
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
        {label
          ? `Vous allez supprimer le paiement « ${label} ».`
          : 'Vous allez supprimer définitivement ce paiement.'}
      </p>
    </Modal>
  );
}
