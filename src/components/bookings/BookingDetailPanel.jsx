import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Drawer from '../Drawer.jsx';
import Badge from '../Badge.jsx';
import ProspectPicker from '../tasks/ProspectPicker.jsx';
import { bookingStatusColor } from '../../lib/config.js';
import {
  formatDateTime,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from '../../lib/format.js';
import { ExternalLinkIcon } from '../icons.jsx';
import BookingEmailButton from './BookingEmailButton.jsx';

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-text-strong">{label}</span>
      {children}
    </label>
  );
}

function ReadRow({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <div className="text-sm text-text-strong">{children}</div>
    </div>
  );
}

export default function BookingDetailPanel({
  booking,
  people,
  statuses,
  meetingTypes,
  editMode,
  onClose,
  onSave,
  onCancelBooking,
  onDelete,
  onEmail,
}) {
  const [editing, setEditing] = useState(editMode);
  const [form, setForm] = useState(() => formFromBooking(booking, people));
  const [notes, setNotes] = useState(booking.notes || '');
  const [saving, setSaving] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm(formFromBooking(booking, people));
    setNotes(booking.notes || '');
    setEditing(editMode);
    setError(null);
  }, [booking, editMode, people]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const color = bookingStatusColor(booking.bookingStatus);

  const prospectId = booking.prospectRecordIds?.[0];
  const linkedPerson = people.find((p) => p.recordId === prospectId);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.studentName || form.name,
        studentName: form.studentName,
        email: form.email,
        phone: form.phone,
        dateTime: fromDatetimeLocalValue(form.dateTime),
        meetingType: form.meetingType,
        bookingStatus: form.bookingStatus,
        meetingLink: form.meetingLink,
        notes: form.notes,
        prospectRecordIds: form.prospect
          ? [form.prospect.recordId]
          : booking.prospectRecordIds || [],
      });
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleNotesBlur = async () => {
    if (notes === (booking.notes || '')) return;
    setNotesSaving(true);
    try {
      await onSave({ notes });
    } catch (err) {
      setError(err.message || 'Notes non enregistrées');
      setNotes(booking.notes || '');
    } finally {
      setNotesSaving(false);
    }
  };

  const handleStatusChange = async (e) => {
    const next = e.target.value;
    setForm((f) => ({ ...f, bookingStatus: next }));
    if (editing) return;
    try {
      await onSave({ bookingStatus: next });
    } catch (err) {
      setError(err.message || 'Statut non mis à jour');
      setForm((f) => ({ ...f, bookingStatus: booking.bookingStatus }));
    }
  };

  return (
    <Drawer
      title={booking.studentName || booking.name || 'Booking'}
      subtitle={formatDateTime(booking.dateTime)}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <BookingEmailButton
              booking={booking}
              onChoose={(kind) => onEmail?.(kind)}
            />
            {booking.bookingStatus !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => onCancelBooking(booking)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-amber-800 transition hover:border-amber-300"
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(booking)}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Supprimer
            </button>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setForm(formFromBooking(booking, people));
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={saving}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
                >
                  Annuler l’édition
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Éditer
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {editing ? (
          <div className="space-y-4">
            <Field label="Nom étudiant">
              <input
                className={inputClass}
                value={form.studentName}
                onChange={set('studentName')}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={set('email')}
                />
              </Field>
              <Field label="Téléphone">
                <input
                  type="tel"
                  className={inputClass}
                  value={form.phone}
                  onChange={set('phone')}
                />
              </Field>
              <Field label="Date & heure">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.dateTime}
                  onChange={set('dateTime')}
                />
              </Field>
              <Field label="Type de meeting">
                <select
                  className={inputClass}
                  value={form.meetingType}
                  onChange={set('meetingType')}
                >
                  <option value="">—</option>
                  {meetingTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Statut">
                <select
                  className={inputClass}
                  value={form.bookingStatus}
                  onChange={set('bookingStatus')}
                >
                  <option value="">—</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Lien meeting">
              <input
                type="url"
                className={inputClass}
                value={form.meetingLink}
                onChange={set('meetingLink')}
                placeholder="https://…"
              />
            </Field>
            <Field label="Prospect lié">
              <ProspectPicker
                people={people}
                sources={['Prospect']}
                value={form.prospect ? [form.prospect] : []}
                onChange={(selected) =>
                  setForm((f) => ({
                    ...f,
                    prospect: selected[selected.length - 1] || null,
                  }))
                }
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={4}
                className={inputClass}
                value={form.notes}
                onChange={set('notes')}
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadRow label="Email">{booking.email || '—'}</ReadRow>
              <ReadRow label="Téléphone">{booking.phone || '—'}</ReadRow>
              <ReadRow label="Date & heure">
                {formatDateTime(booking.dateTime)}
              </ReadRow>
              <ReadRow label="Type">{booking.meetingType || '—'}</ReadRow>
              <ReadRow label="Statut">
                <select
                  className={`${inputClass} mt-0.5`}
                  value={form.bookingStatus}
                  onChange={handleStatusChange}
                >
                  <option value="">—</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <Badge
                    label={booking.bookingStatus || '—'}
                    bg={color.bg}
                    text={color.text}
                  />
                </div>
              </ReadRow>
            </div>

            <ReadRow label="Prospect lié">
              {prospectId ? (
                <Link
                  to={`/prospects?open=${prospectId}`}
                  className="font-medium text-brand underline-offset-2 hover:underline"
                  onClick={onClose}
                >
                  {linkedPerson?.fullName ||
                    linkedPerson?.badgeId ||
                    'Voir le prospect'}
                </Link>
              ) : (
                '—'
              )}
            </ReadRow>

            <ReadRow label="Lien meeting">
              {booking.meetingLink ? (
                <a
                  href={booking.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  <ExternalLinkIcon size={14} />
                  Join Meeting
                </a>
              ) : (
                '—'
              )}
            </ReadRow>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Notes
                </p>
                {notesSaving && (
                  <span className="text-xs text-text-muted">Enregistrement…</span>
                )}
              </div>
              <textarea
                rows={4}
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Ajouter une note…"
              />
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function formFromBooking(booking, people = []) {
  const prospectId = booking.prospectRecordIds?.[0] || null;
  const linked = prospectId
    ? people.find((p) => p.recordId === prospectId)
    : null;
  return {
    name: booking.name || '',
    studentName: booking.studentName || '',
    email: booking.email || '',
    phone: booking.phone || '',
    dateTime: toDatetimeLocalValue(booking.dateTime),
    meetingType: booking.meetingType || '',
    bookingStatus: booking.bookingStatus || '',
    meetingLink: booking.meetingLink || '',
    notes: booking.notes || '',
    prospect: linked
      ? linked
      : prospectId
        ? { recordId: prospectId, key: prospectId, fullName: '', badgeId: '' }
        : null,
  };
}
