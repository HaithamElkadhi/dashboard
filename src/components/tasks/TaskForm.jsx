import { useState } from 'react';
import {
  ALL_TASK_STATUSES,
  ASSIGNEES,
  PRIORITY_COLORS,
  STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_TYPES,
} from '../../lib/config.js';
import { PRIORITY_LABELS_FR, STATUS_LABELS_FR, TYPE_LABELS_FR } from '../../lib/taskLabels.js';
import ProspectPicker from './ProspectPicker.jsx';
import ChipSelect from './ChipSelect.jsx';

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
      className="space-y-4"
    >
      <Field label="Titre" required>
        <input
          className={inputClass}
          value={form.name}
          onChange={set('name')}
          placeholder="Ex. Relancer le dossier visa"
        />
      </Field>

      <Field label="Type" required asLabel={false}>
        <ChipSelect
          options={TASK_TYPES}
          labels={TYPE_LABELS_FR}
          value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v }))}
        />
      </Field>

      <Field label="Priorité" required asLabel={false}>
        <ChipSelect
          options={TASK_PRIORITIES}
          labels={PRIORITY_LABELS_FR}
          value={form.priority}
          colors={PRIORITY_COLORS}
          onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
        />
      </Field>

      <Field label="Responsable" required asLabel={false}>
        <ChipSelect
          options={ASSIGNEES}
          value={form.assignedTo}
          onChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}
        />
      </Field>

      {showStatus && (
        <Field label="Statut" asLabel={false}>
          <ChipSelect
            options={ALL_TASK_STATUSES}
            labels={STATUS_LABELS_FR}
            value={form.status}
            colors={STATUS_COLORS}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </Field>
      )}

      <Field label="Date d’échéance">
        <input
          type="date"
          className={`${inputClass} max-w-xs`}
          value={form.ddl}
          onChange={set('ddl')}
        />
      </Field>

      <Field label="Étudiant / Prospect" asLabel={false}>
        <ProspectPicker
          people={people}
          value={form.selectedPeople}
          onChange={(selectedPeople) =>
            setForm((f) => ({ ...f, selectedPeople }))
          }
        />
      </Field>

      <Field label="Description / notes">
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

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : submitLabel}
        </button>
        {showCreateAnother && (
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60"
          >
            Créer et ajouter une autre
          </button>
        )}
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
