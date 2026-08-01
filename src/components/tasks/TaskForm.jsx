import { useState } from 'react';
import {
  ASSIGNEES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from '../../lib/config.js';
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

function Field({ label, required, children, asLabel = true }) {
  const Wrapper = asLabel ? 'label' : 'div';
  return (
    <Wrapper className="block space-y-1.5">
      <span className="block text-sm font-medium text-text-strong">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </Wrapper>
  );
}

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

function emptyForm() {
  return {
    name: '',
    type: '',
    priority: '',
    assignedTo: '',
    status: 'Todo',
    ddl: '',
    notes: '',
    selectedPeople: [],
  };
}

export default function TaskForm({
  people,
  initial,
  submitLabel = 'Créer la tâche',
  onSubmit,
  onCancel,
  showStatus = false,
}) {
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type || !form.priority || !form.assignedTo) {
      setError('Titre, type, priorité et assigné sont obligatoires.');
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
      await onSubmit(payload);
      if (!initial) setForm(emptyForm());
    } catch (err) {
      setError(err.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Titre" required>
        <input
          className={inputClass}
          value={form.name}
          onChange={set('name')}
          placeholder="Ex. Relancer le dossier visa"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <select className={inputClass} value={form.type} onChange={set('type')}>
            <option value="">Choisir…</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priorité" required>
          <select
            className={inputClass}
            value={form.priority}
            onChange={set('priority')}
          >
            <option value="">Choisir…</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigné à" required>
          <select
            className={inputClass}
            value={form.assignedTo}
            onChange={set('assignedTo')}
          >
            <option value="">Choisir…</option>
            {ASSIGNEES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Deadline">
          <input
            type="date"
            className={inputClass}
            value={form.ddl}
            onChange={set('ddl')}
          />
        </Field>
        {showStatus && (
          <Field label="Statut">
            <select
              className={inputClass}
              value={form.status}
              onChange={set('status')}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <Field label="Prospect / Lead" asLabel={false}>
        <ProspectPicker
          people={people}
          value={form.selectedPeople}
          onChange={(selectedPeople) =>
            setForm((f) => ({ ...f, selectedPeople }))
          }
        />
      </Field>

      <Field label="Notes">
        <textarea
          rows={3}
          className={inputClass}
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

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
