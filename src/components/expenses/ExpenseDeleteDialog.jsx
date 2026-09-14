import { useState } from 'react';
import Modal from '../Modal.jsx';

export default function ExpenseDeleteDialog({ expense, onClose, onConfirm }) {
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

  return (
    <Modal
      title="Delete this expense?"
      subtitle="This cannot be undone."
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-text-muted">
        {expense?.description
          ? `You are about to delete “${expense.description}”.`
          : 'You are about to permanently delete this expense.'}
      </p>
    </Modal>
  );
}
