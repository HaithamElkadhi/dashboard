import { useState } from 'react';
import Modal from '../Modal.jsx';
import { ExternalLinkIcon } from '../icons.jsx';

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

function UrlField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="url"
          className={inputClass}
          value={value}
          onChange={onChange}
          placeholder="https://…"
        />
        {value.trim() && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            title="Ouvrir le lien"
            className="shrink-0 rounded-lg border border-border p-2.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
          >
            <ExternalLinkIcon size={16} />
          </a>
        )}
      </div>
    </Field>
  );
}

export default function ScholarshipModal({ prospect, choices, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    scholarshipFolder: prospect.scholarshipFolder || '',
    scholarshipType: prospect.scholarshipType || '',
    scholarshipSubmissionDate: prospect.scholarshipSubmissionDate || '',
    scholarshipPayment: prospect.scholarshipPayment || '',
    scholarshipDDL: prospect.scholarshipDDL || '',
    regionAuthority: prospect.regionAuthority || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const typeChoices = choices?.scholarshipType || [];
  const paymentChoices = choices?.scholarshipPayment || [];
  const regionChoices = choices?.regionAuthority || [];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        scholarshipFolder: form.scholarshipFolder.trim(),
        scholarshipType: form.scholarshipType,
        scholarshipSubmissionDate: form.scholarshipSubmissionDate || null,
        scholarshipPayment: form.scholarshipPayment,
        scholarshipDDL: form.scholarshipDDL || null,
        regionAuthority: form.regionAuthority,
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
      title="Dossier Bourse"
      subtitle={prospect.fullName || prospect.prospectId}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="submit"
            form="scholarship-edit-form"
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
      <form id="scholarship-edit-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scholarship Type">
            <select
              className={inputClass}
              value={form.scholarshipType}
              onChange={set('scholarshipType')}
            >
              <option value="">—</option>
              {typeChoices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region/Authority">
            <select
              className={inputClass}
              value={form.regionAuthority}
              onChange={set('regionAuthority')}
            >
              <option value="">—</option>
              {regionChoices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Scholarship Payment">
          <select
            className={inputClass}
            value={form.scholarshipPayment}
            onChange={set('scholarshipPayment')}
          >
            <option value="">—</option>
            {paymentChoices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scholarship Submission Date">
            <input
              type="date"
              className={inputClass}
              value={form.scholarshipSubmissionDate}
              onChange={set('scholarshipSubmissionDate')}
            />
          </Field>
          <Field label="Scholarship DDL">
            <input
              type="date"
              className={inputClass}
              value={form.scholarshipDDL}
              onChange={set('scholarshipDDL')}
            />
          </Field>
        </div>

        <UrlField
          label="Scholarship Folder"
          value={form.scholarshipFolder}
          onChange={set('scholarshipFolder')}
        />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
