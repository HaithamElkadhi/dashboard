import { useState } from 'react';
import Modal from '../Modal.jsx';
import { GOAL_PERIOD_TYPES } from '../../lib/config.js';
import { GOAL_METRICS, defaultGoalName, periodDates, toISODate } from '../../lib/goals.js';
import { SaveIcon } from '../icons.jsx';

// Create / edit a goal: a period + up to 3 targets. Results are computed
// automatically, so there's nothing else to enter.

const inputClass =
  'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition focus:border-border-strong';

function emptyGoal() {
  const periodType = '📅 Monthly';
  const dates = periodDates(periodType, toISODate(new Date()));
  return {
    name: defaultGoalName(periodType, dates.startDate),
    periodType,
    ...dates,
    ...Object.fromEntries(GOAL_METRICS.map((m) => [m.target, ''])),
    targetCollection: '',
  };
}

function fromGoal(goal) {
  return {
    name: goal.name,
    periodType: goal.periodType || '⏰ Deadline-based',
    startDate: goal.startDate,
    endDate: goal.endDate,
    ...Object.fromEntries(GOAL_METRICS.map((m) => [m.target, goal[m.target] ?? ''])),
    targetCollection: goal.targetCollection ?? '',
  };
}

export default function GoalModal({ goal, onClose, onSave }) {
  const isEdit = Boolean(goal?.id);
  const [form, setForm] = useState(() => (isEdit ? fromGoal(goal) : emptyGoal()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Keep suggesting a name until the user types their own.
  const [nameTouched, setNameTouched] = useState(isEdit);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const applyPeriod = (periodType, refIso) => {
    const dates = periodDates(periodType, refIso);
    const next = { periodType, ...(dates || {}) };
    if (!nameTouched) next.name = defaultGoalName(periodType, next.startDate || form.startDate);
    set(next);
  };

  // Switching type keeps the same moment: today if it's in the current period,
  // otherwise the end (a week can start in the previous month) or the start.
  const switchType = (periodType) => {
    const todayIso = toISODate(new Date());
    const { startDate, endDate } = form;
    const ref =
      startDate && endDate && startDate <= todayIso && todayIso <= endDate
        ? todayIso
        : periodType === '📅 Monthly'
          ? endDate || startDate
          : startDate || endDate;
    applyPeriod(periodType, ref);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Donne un nom à l’objectif.');
    if (!form.startDate || !form.endDate) return setError('Choisis une date de début et de fin.');
    if (form.endDate < form.startDate) return setError('La date de fin est avant la date de début.');
    if (!GOAL_METRICS.some((m) => Number(form[m.target]) > 0) && !(Number(form.targetCollection) > 0)) {
      return setError('Fixe au moins une cible.');
    }
    if (Number(form.targetCollection) > 100) return setError('L’encaissement visé ne peut pas dépasser 100 %.');
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Modifier l’objectif' : 'Nouvel objectif'}
      subtitle="Choisis la période et tes cibles — les résultats se calculent tout seuls."
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-red-600">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-strong"
            >
              Annuler
            </button>
            <button data-write=""
              type="submit"
              form="goal-form"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <SaveIcon size={14} />
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer l’objectif'}
            </button>
          </div>
        </div>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {GOAL_PERIOD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => switchType(t.value)}
              className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                form.periodType === t.value
                  ? 'border-brand bg-brand/5 text-text-strong ring-1 ring-brand'
                  : 'border-border text-text-muted hover:border-border-strong hover:text-text-strong'
              }`}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {form.periodType === '📅 Monthly' ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-text-muted">Mois</span>
            <input
              type="month"
              value={form.startDate ? form.startDate.slice(0, 7) : ''}
              onChange={(e) => e.target.value && applyPeriod(form.periodType, `${e.target.value}-01`)}
              className={inputClass}
            />
          </label>
        ) : form.periodType === '📆 Weekly' ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-text-muted">Un jour de la semaine</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => e.target.value && applyPeriod(form.periodType, e.target.value)}
              className={inputClass}
            />
            {form.startDate && form.endDate && (
              <span className="block text-xs text-text-muted">
                Du {new Date(`${form.startDate}T00:00`).toLocaleDateString('fr-FR')} au{' '}
                {new Date(`${form.endDate}T00:00`).toLocaleDateString('fr-FR')}
              </span>
            )}
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-text-muted">Début</span>
              <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-text-muted">Échéance</span>
              <input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputClass} />
            </label>
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-text-muted">Nom</span>
          <input
            value={form.name}
            onChange={(e) => {
              setNameTouched(true);
              set({ name: e.target.value });
            }}
            placeholder="Ex. Octobre 2026"
            className={inputClass}
          />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Cibles pour la période</p>
          <div className="grid grid-cols-3 gap-3">
            {GOAL_METRICS.map((m) => (
              <label key={m.key} className="block rounded-xl border border-border p-3 text-center">
                <span className="block text-xl">{m.emoji}</span>
                <span className="block text-xs text-text-muted">{m.label}</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form[m.target]}
                  onChange={(e) => set({ [m.target]: e.target.value })}
                  placeholder="—"
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-surface text-center text-lg font-semibold text-text-strong outline-none focus:border-border-strong"
                />
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="text-xl">💰</span>
            <span className="flex-1">
              <span className="block text-sm text-text-strong">Encaissement visé</span>
              <span className="block text-xs text-text-muted">Part du facturé de la période qui doit être payée</span>
            </span>
            <span className="relative w-28">
              <input
                type="number"
                min="0"
                max="100"
                inputMode="numeric"
                value={form.targetCollection}
                onChange={(e) => set({ targetCollection: e.target.value })}
                placeholder="—"
                className="h-10 w-full rounded-lg border border-border bg-surface pr-8 text-center text-lg font-semibold text-text-strong outline-none focus:border-border-strong"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">%</span>
            </span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
