import { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Modal from '../Modal.jsx';
import { SITUATION_CHOICES } from '../../lib/config.js';
import { normalizeIntake } from '../../lib/airtable.js';

// First date each stage was reached ("📅 Date …" fields) — set once, but
// correctable here.
const STAGE_DATES = [
  { key: 'dateLead', label: 'Lead' },
  { key: 'dateProspect', label: 'Prospect' },
  { key: 'dateCandidate', label: 'Candidate' },
  { key: 'dateStudent', label: 'Student' },
  { key: 'dateLost', label: 'Lost' },
];

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
          <button data-write=""
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
  const { readOnly } = useAuth();
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
    intakes: [...new Set((prospect.intakeRaw || []).map(normalizeIntake).filter(Boolean))],
    ...Object.fromEntries(STAGE_DATES.map((d) => [d.key, prospect[d.key] || ''])),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const situationChoices = choices?.situation?.length ? choices.situation : SITUATION_CHOICES;
  const admissionChoices = choices?.admission || [];
  const scholarshipChoices = choices?.scholarship || [];
  const visaChoices = choices?.visa || [];
  const universitalyChoices = choices?.universitaly || [];

  // Année scolaire: Airtable has two spellings per year ("26 - 27 " and
  // "2026/2027") — show one chip per year and save an existing option,
  // preferring the "YYYY/YYYY" spelling.
  const intakeOptions = useMemo(() => {
    const byYear = new Map();
    (choices?.intake || []).forEach((raw) => {
      const year = normalizeIntake(raw);
      if (!year) return;
      const current = byYear.get(year);
      if (!current || (raw.includes('/') && !current.includes('/'))) byYear.set(year, raw);
    });
    return byYear;
  }, [choices]);
  const intakeYears = [...intakeOptions.keys()].sort();
  const initialIntakes = useMemo(
    () => [...new Set((prospect.intakeRaw || []).map(normalizeIntake).filter(Boolean))].sort().join('|'),
    [prospect.intakeRaw]
  );

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
        // Only rewrite the intake when it was changed (keeps Airtable's spelling).
        ...([...form.intakes].sort().join('|') !== initialIntakes
          ? { intendedIntake: form.intakes.map((y) => intakeOptions.get(y) || y) }
          : {}),
        ...Object.fromEntries(STAGE_DATES.map((d) => [d.key, form[d.key] || null])),
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
      title={readOnly ? 'Student details' : 'Modifier le prospect'}
      subtitle={prospect.fullName || prospect.prospectId}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button data-write=""
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
            <input data-write=""
              className={inputClass}
              value={form.name}
              onChange={set('name')}
              placeholder="Prénom"
            />
          </Field>
          <Field label="Nom">
            <input data-write=""
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
          <input data-write=""
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
            <select data-write=""
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
            <select data-write="" className={inputClass} value={form.visaStatus} onChange={set('visaStatus')}>
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
            <input data-write=""
              type="date"
              className={inputClass}
              value={form.visaAppointmentDate}
              onChange={set('visaAppointmentDate')}
            />
          </Field>
          <Field label="Universitaly Validation">
            <select data-write=""
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

        <Field label="Année scolaire">
          <ChipPicker choices={intakeYears} value={form.intakes} onToggle={toggleIn('intakes')} />
        </Field>

        <div>
          <p className="text-sm font-medium text-text-strong">Dates d’étape</p>
          <p className="mb-2 text-xs text-text-muted">
            1ʳᵉ fois que la personne a atteint chaque étape — utilisées pour les objectifs.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STAGE_DATES.map((d) => (
              <label key={d.key} className="block space-y-1">
                <span className="block text-xs text-text-muted">📅 {d.label}</span>
                <input type="date" className={inputClass} value={form[d.key]} onChange={set(d.key)} />
              </label>
            ))}
          </div>
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
