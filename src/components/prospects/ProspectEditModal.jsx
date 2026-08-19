import { useState } from 'react';
import Modal from '../Modal.jsx';
import { SITUATION_CHOICES } from '../../lib/config.js';

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

function ChipPicker({ choices, value, onToggle }) {
  if (choices.length === 0) {
    return <p className="text-sm text-text-muted">Aucune option configurée.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-canvas px-2.5 py-2">
      {choices.map((choice) => {
        const active = value.includes(choice);
        return (
          <button
            key={choice}
            type="button"
            onClick={() => onToggle(choice)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              active
                ? 'border-transparent bg-brand text-white'
                : 'border-border bg-surface text-text-strong hover:border-border-strong'
            }`}
          >
            {choice}
          </button>
        );
      })}
    </div>
  );
}

export default function ProspectEditModal({ prospect, choices, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    name: prospect.firstName || '',
    surname: prospect.lastName || '',
    situations: prospect.situations || [],
    admissionStatus: prospect.admissionStatus || [],
    approvedUniversity: prospect.university || '',
    scholarshipStatus: prospect.scholarshipStatus || '',
    visaStatus: prospect.visaStatus || '',
    visaAppointmentDate: prospect.visaAppointmentDate || '',
    universitalyValidation: prospect.universitalyValidation || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const situationChoices = choices?.situation?.length ? choices.situation : SITUATION_CHOICES;
  const admissionChoices = choices?.admission || [];
  const scholarshipChoices = choices?.scholarship || [];
  const visaChoices = choices?.visa || [];
  const universitalyChoices = choices?.universitaly || [];

  const toggleIn = (key) => (choice) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(choice)
        ? f[key].filter((c) => c !== choice)
        : [...f[key], choice],
    }));

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        surname: form.surname.trim(),
        situations: form.situations,
        admissionStatus: form.admissionStatus,
        approvedUniversity: form.approvedUniversity.trim(),
        scholarshipStatus: form.scholarshipStatus,
        visaStatus: form.visaStatus,
        visaAppointmentDate: form.visaAppointmentDate || null,
        universitalyValidation: form.universitalyValidation,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Modifier le prospect"
      subtitle={prospect.fullName || prospect.prospectId}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="submit"
            form="prospect-edit-form"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong"
          >
            Annuler
          </button>
        </div>
      }
    >
      <form id="prospect-edit-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom">
            <input
              className={inputClass}
              value={form.name}
              onChange={set('name')}
              placeholder="Prénom"
            />
          </Field>
          <Field label="Nom">
            <input
              className={inputClass}
              value={form.surname}
              onChange={set('surname')}
              placeholder="Nom"
            />
          </Field>
        </div>

        <Field label="Situation">
          <ChipPicker
            choices={situationChoices}
            value={form.situations}
            onToggle={toggleIn('situations')}
          />
        </Field>

        <Field label="Université (validée)">
          <input
            className={inputClass}
            value={form.approvedUniversity}
            onChange={set('approvedUniversity')}
            placeholder="Nom de l'université"
          />
        </Field>

        <Field label="Admission">
          <ChipPicker
            choices={admissionChoices}
            value={form.admissionStatus}
            onToggle={toggleIn('admissionStatus')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scholarship">
            <select
              className={inputClass}
              value={form.scholarshipStatus}
              onChange={set('scholarshipStatus')}
            >
              <option value="">—</option>
              {scholarshipChoices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visa">
            <select className={inputClass} value={form.visaStatus} onChange={set('visaStatus')}>
              <option value="">—</option>
              {visaChoices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de rendez-vous visa">
            <input
              type="date"
              className={inputClass}
              value={form.visaAppointmentDate}
              onChange={set('visaAppointmentDate')}
            />
          </Field>
          <Field label="Universitaly Validation">
            <select
              className={inputClass}
              value={form.universitalyValidation}
              onChange={set('universitalyValidation')}
            >
              <option value="">—</option>
              {universitalyChoices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
