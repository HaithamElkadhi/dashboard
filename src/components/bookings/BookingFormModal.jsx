import { useState } from 'react';
import ProspectPicker from '../tasks/ProspectPicker.jsx';
import {
  fromDatetimeLocalValue,
} from '../../lib/format.js';

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-text-strong">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function emptyForm(statuses, meetingTypes) {
  return {
    studentName: '',
    email: '',
    phone: '',
    dateTime: '',
    meetingType: meetingTypes[0] || '',
    bookingStatus: statuses.includes('Scheduled')
      ? 'Scheduled'
      : statuses[0] || '',
    meetingLink: '',
    notes: '',
    prospect: null,
  };
}

export default function BookingFormModal({
  people,
  statuses,
  meetingTypes,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => emptyForm(statuses, meetingTypes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim()) {
      setError('Le nom de l’étudiant est requis.');
      return;
    }
    if (!form.dateTime) {
      setError('La date et l’heure sont requises.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: form.studentName.trim(),
        studentName: form.studentName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateTime: fromDatetimeLocalValue(form.dateTime),
        meetingType: form.meetingType || null,
        bookingStatus: form.bookingStatus || null,
        meetingLink: form.meetingLink.trim(),
        notes: form.notes,
        prospectRecordIds: form.prospect ? [form.prospect.recordId] : [],
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Échec de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl scroll-thin">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-strong">
            Créer un booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1 text-sm text-text-muted hover:border-border-strong"
          >
            Fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Prospect lié">
            <ProspectPicker
              people={people}
              sources={['Prospect']}
              value={form.prospect ? [form.prospect] : []}
              onChange={(selected) => {
                const prospect = selected[selected.length - 1] || null;
                setForm((f) => ({
                  ...f,
                  prospect,
                  studentName:
                    f.studentName || prospect?.fullName || f.studentName,
                }));
              }}
            />
          </Field>

          <Field label="Nom étudiant" required>
            <input
              className={inputClass}
              value={form.studentName}
              onChange={set('studentName')}
              required
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
            <Field label="Date & heure" required>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.dateTime}
                onChange={set('dateTime')}
                required
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

          <Field label="Notes">
            <textarea
              rows={3}
              className={inputClass}
              value={form.notes}
              onChange={set('notes')}
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Création…' : 'Créer le booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
