import { useState } from 'react';
import {
  ALL_TASK_STATUSES,
  ASSIGNEES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from '../../lib/config.js';
import { PRIORITY_LABELS_FR, STATUS_LABELS_FR, TYPE_LABELS_FR } from '../../lib/taskLabels.js';
import ProspectPicker from './ProspectPicker.jsx';

function peopleFromProspectName(prospectName, people) {
  if (!prospectName) return [];
  const names = prospectName
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return names
    .map((name) => {
      const match = people.find(
        (p) => p.fullName.toLowerCase() === name.toLowerCase()
      );
      return (
        match || {
          key: `manual:${name}`,
          fullName: name,
          badgeId: '',
          source: 'Prospect',
        }
      );
    });
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="block text-sm font-medium text-text-strong">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/15';

const selectClass = `${inputClass} appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9`;

const SELECT_ARROW =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E";

function Select({ value, onChange, placeholder, children, required }) {
  return (
    <select
      required={required}
      value={value}
      onChange={onChange}
      className={selectClass}
      style={{ backgroundImage: `url("${SELECT_ARROW}")` }}
    >
      {placeholder != null && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

function emptyForm(initialStatus) {
  return {
    name: '',
    type: '',
    priority: '',
    assignedTo: '',
    status: initialStatus || 'Todo',
    ddl: '',
    notes: '',
    selectedPeople: [],
  };
}

export default function TaskForm({
  people,
  initial,
  initialStatus,
  submitLabel = 'Créer la tâche',
  onSubmit,
  onCancel,
  showStatus = true,
  showCreateAnother = false,
  compact = false,
}) {
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm(initialStatus);
    return {
      name: initial.name || '',
      type: initial.type || '',
      priority: initial.priority || '',
      assignedTo: initial.assignedTo || '',
      status: initial.status || 'Todo',
      ddl: initial.ddl || '',
      notes: initial.notes || '',
      selectedPeople: peopleFromProspectName(initial.prospectName, people),
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (keepOpen) => {
    if (!form.name.trim() || !form.type || !form.priority || !form.assignedTo) {
      setError('Titre, type, priorité et responsable sont obligatoires.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const prospectName = form.selectedPeople
        .map((p) => p.fullName.trim())
        .filter(Boolean)
        .join(', ');
      const payload = {
        name: form.name.trim(),
        type: form.type,
        priority: form.priority,
        assignedTo: form.assignedTo,
        status: form.status || 'Todo',
        ddl: form.ddl || '',
        notes: form.notes,
        prospectName,
      };
      await onSubmit(payload, keepOpen);
      if (!initial) setForm(emptyForm(initialStatus));
    } catch (err) {
      setError(err.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className={compact ? 'space-y-4' : 'space-y-5'}
    >
      <Field label="Titre" required>
        <input
          autoFocus={!initial}
          className={inputClass}
          value={form.name}
          onChange={set('name')}
          placeholder="Ex. Relancer le dossier visa"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <Select
            required
            value={form.type}
            onChange={set('type')}
            placeholder="Choisir un type"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS_FR[t] || t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priorité" required>
          <Select
            required
            value={form.priority}
            onChange={set('priority')}
            placeholder="Choisir une priorité"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS_FR[p] || p}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Responsable" required>
          <Select
            required
            value={form.assignedTo}
            onChange={set('assignedTo')}
            placeholder="Assigner à…"
          >
            {ASSIGNEES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>

        {showStatus ? (
          <Field label="Statut">
            <Select value={form.status} onChange={set('status')}>
              {ALL_TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS_FR[s] || s}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Date d’échéance">
            <input
              type="date"
              className={inputClass}
              value={form.ddl}
              onChange={set('ddl')}
            />
          </Field>
        )}
      </div>

      {showStatus && (
        <Field label="Date d’échéance" className="sm:max-w-xs">
          <input
            type="date"
            className={inputClass}
            value={form.ddl}
            onChange={set('ddl')}
          />
        </Field>
      )}

      <div className="block space-y-1.5">
        <span className="block text-sm font-medium text-text-strong">
          Étudiant / Prospect
        </span>
        <ProspectPicker
          people={people}
          value={form.selectedPeople}
          onChange={(selectedPeople) =>
            setForm((f) => ({ ...f, selectedPeople }))
          }
        />
      </div>

      <Field label="Description / notes">
        <textarea
          rows={compact ? 3 : 4}
          className={`${inputClass} resize-y`}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Notes internes…"
        />
      </Field>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-strong transition hover:border-border-strong hover:bg-canvas"
          >
            Annuler
          </button>
        )}
        {showCreateAnother && (
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(true)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-strong transition hover:border-border-strong hover:bg-canvas disabled:opacity-60"
          >
            Créer et ajouter une autre
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
