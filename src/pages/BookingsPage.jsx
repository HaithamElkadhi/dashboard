import { useState } from 'react';
import { useBookingsData } from '../hooks/useBookingsData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { ErrorState } from '../components/states.jsx';
import Toast from '../components/Toast.jsx';
import BookingsTable from '../components/bookings/BookingsTable.jsx';
import BookingDetailPanel from '../components/bookings/BookingDetailPanel.jsx';
import BookingFormModal from '../components/bookings/BookingFormModal.jsx';
import BookingDeleteDialog from '../components/bookings/BookingDeleteDialog.jsx';
import BookingCancelDialog from '../components/bookings/BookingCancelDialog.jsx';
import BookingEmailPreviewModal from '../components/bookings/BookingEmailPreviewModal.jsx';
import { PlusIcon, RefreshIcon } from '../components/icons.jsx';

export default function BookingsPage() {
  const {
    bookings,
    people,
    statuses,
    meetingTypes,
    status,
    error,
    lastUpdated,
    refresh,
    create,
    update,
    remove,
  } = useBookingsData();
  usePageRefreshRegistration({
    lastUpdated,
    refresh,
    loading: status === 'loading',
  });

  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [panel, setPanel] = useState(null); // { booking, editMode }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null); // { booking, kind }

  const loading = status === 'loading';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const liveBooking = (id) => bookings.find((b) => b.id === id);

  const handleCreate = async (payload) => {
    try {
      const created = await create(payload);
      showToast('Booking créé');
      setPanel({ booking: created, editMode: false });
    } catch (err) {
      showToast(err.message || 'Création impossible');
      throw err;
    }
  };

  const handleUpdate = async (bookingId, payload) => {
    const updated = await update(bookingId, payload);
    setPanel((prev) =>
      prev && prev.booking.id === bookingId
        ? { ...prev, booking: updated, editMode: false }
        : prev
    );
    return updated;
  };

  const handleCancelConfirm = async () => {
    try {
      await update(cancelTarget.id, { bookingStatus: 'Cancelled' });
      showToast('Booking annulé');
      setCancelTarget(null);
      setPanel((prev) =>
        prev && prev.booking.id === cancelTarget.id
          ? {
              ...prev,
              booking: { ...prev.booking, bookingStatus: 'Cancelled' },
            }
          : prev
      );
    } catch (err) {
      showToast(err.message || 'Annulation impossible');
      setCancelTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const id = deleteTarget.id;
      await remove(id);
      showToast('Booking supprimé');
      setDeleteTarget(null);
      setPanel((prev) => (prev && prev.booking.id === id ? null : prev));
    } catch (err) {
      showToast(err.message || 'Suppression impossible');
      setDeleteTarget(null);
    }
  };

  const panelBooking = panel ? liveBooking(panel.booking.id) || panel.booking : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-strong">Booking</h1>
          <p className="text-sm text-text-muted">
            Consultations planifiées synchronisées avec Airtable
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-50"
          >
            <RefreshIcon size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <PlusIcon size={14} />
            Create Booking
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-4">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      <div className="mt-5">
        <BookingsTable
          bookings={bookings}
          loading={loading && bookings.length === 0}
          statuses={statuses}
          meetingTypes={meetingTypes}
          onOpen={(b) => setPanel({ booking: b, editMode: false })}
          onEdit={(b) => setPanel({ booking: b, editMode: true })}
          onCancel={(b) => setCancelTarget(b)}
          onDelete={(b) => setDeleteTarget(b)}
          onEmail={(b, kind) => setEmailDraft({ booking: b, kind })}
        />
      </div>

      {createOpen && (
        <BookingFormModal
          people={people}
          statuses={statuses}
          meetingTypes={meetingTypes}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {panel && panelBooking && (
        <BookingDetailPanel
          key={panelBooking.id}
          booking={panelBooking}
          people={people}
          statuses={statuses}
          meetingTypes={meetingTypes}
          editMode={panel.editMode}
          onClose={() => setPanel(null)}
          onSave={(payload) => handleUpdate(panelBooking.id, payload)}
          onCancelBooking={(b) => setCancelTarget(b)}
          onDelete={(b) => setDeleteTarget(b)}
          onEmail={(kind) =>
            setEmailDraft({ booking: panelBooking, kind })
          }
        />
      )}

      {emailDraft && (
        <BookingEmailPreviewModal
          booking={emailDraft.booking}
          kind={emailDraft.kind}
          onClose={() => setEmailDraft(null)}
          onSent={() => showToast('Email envoyé')}
        />
      )}

      {cancelTarget && (
        <BookingCancelDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {deleteTarget && (
        <BookingDeleteDialog
          booking={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
