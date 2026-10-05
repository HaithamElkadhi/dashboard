import { useCallback, useEffect, useMemo, useState } from 'react';
import GoalModal from './GoalModal.jsx';
import { ErrorState } from '../states.jsx';
import { createGoal, deleteGoal, fetchGoalSources, fetchGoals, updateGoal } from '../../lib/airtable.js';
import { GOAL_PERIOD_TYPES } from '../../lib/config.js';
import { formatMoney } from '../../lib/format.js';
import {
  computeGoalActuals,
  formatRange,
  goalProgress,
  goalStatus,
  paceTone,
} from '../../lib/goals.js';
import { PencilIcon, PlusIcon, TrashIcon } from '../icons.jsx';

// Goals (MOS table): cards with per-target progress, time left and status.
// Results are computed from Airtable data (see lib/goals.js), not typed in.

const TONES = {
  good: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  warn: { pill: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700' },
  bad: { pill: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500', text: 'text-red-600' },
  neutral: { pill: 'bg-canvas text-text-muted border-border', bar: 'bg-brand', text: 'text-text-strong' },
};

const FILTERS = [
  { id: 'active', label: 'En cours' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'ended', label: 'Terminés' },
  { id: 'all', label: 'Tous' },
];

// Empty MOS rows (no name and no dates) are leftovers, not goals.
const isRealGoal = (g) => g.name || g.startDate || g.endDate;

function MetricRow({ m, elapsed }) {
  const tone = TONES[paceTone(m.ratio, elapsed)];
  const pct = Math.round(m.ratio * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-text-strong">
          <span className="mr-1.5">{m.emoji}</span>
          {m.label}
        </span>
        <span className="shrink-0 tabular-nums">
          <span className="text-base font-semibold text-text-strong">{m.hasActual ? m.actualValue : '…'}</span>
          <span className="text-text-muted"> / {m.targetValue}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

// Paid / invoiced for the period, one line per currency, compared with the
// collection rate aimed for (goal.targetCollection, %) when there is one.
function CollectionRows({ collection, target }) {
  if (collection === undefined) return null; // still loading
  if (!collection?.length) {
    return (
      <p className="text-xs text-text-muted">
        💰 Encaissement{target ? ` (objectif ${target}%)` : ''} : aucun paiement facturé sur la période.
      </p>
    );
  }
  return collection.map((c) => {
    const pct = Math.round(c.rate * 100);
    const toneKey = target
      ? c.rate * 100 >= target
        ? 'good'
        : c.rate * 100 >= target * 0.75
          ? 'warn'
          : 'bad'
      : c.rate >= 0.8
        ? 'good'
        : c.rate >= 0.5
          ? 'warn'
          : 'bad';
    const tone = TONES[toneKey];
    return (
      <div key={c.currency}>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="truncate text-text-strong">
            <span className="mr-1.5">💰</span>
            Encaissement {c.currency}
          </span>
          <span className="shrink-0 tabular-nums">
            <span className={`text-base font-semibold ${tone.text}`}>{pct}%</span>
            {target ? <span className="text-text-muted"> / {target}%</span> : null}
          </span>
        </div>
        <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
          {target ? (
            <div
              className="absolute top-0 h-full w-0.5 bg-text-strong/50"
              style={{ left: `${Math.min(100, target)}%` }}
              title={`Objectif ${target}%`}
            />
          ) : null}
        </div>
        <p className="mt-1 text-[11px] tabular-nums text-text-muted">
          {formatMoney(c.paid, c.currency)} payé sur {formatMoney(c.invoiced, c.currency)} facturé
        </p>
      </div>
    );
  });
}

function GoalCard({ goal, actuals, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = goalStatus(goal, actuals);
  const { metrics } = goalProgress(goal, actuals);
  const { timing, overall } = status;
  const tone = TONES[status.tone];
  const type = GOAL_PERIOD_TYPES.find((t) => t.value === goal.periodType);
  const timeText =
    timing.phase === 'upcoming'
      ? timing.startsIn != null
        ? `Commence dans ${timing.startsIn} j`
        : 'À venir'
      : timing.phase === 'ended'
        ? 'Période terminée'
        : timing.daysLeft != null
          ? timing.daysLeft === 0
            ? 'Dernier jour'
            : `${timing.daysLeft} j restants`
          : 'Sans échéance';

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface">
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-text-strong">{goal.name || 'Sans nom'}</h3>
            {type && (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-text-muted">
                {type.emoji} {type.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">{formatRange(goal.startDate, goal.endDate)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-semibold tabular-nums ${overall != null ? tone.text : 'text-text-muted'}`}>
            {overall != null ? `${Math.round(overall * 100)}%` : '—'}
          </p>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.pill}`}>
            {status.emoji} {status.label}
          </span>
        </div>
      </header>

      {/* Time through the period */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>
            {timing.dayIndex && timing.totalDays ? `Jour ${timing.dayIndex} / ${timing.totalDays}` : 'Temps écoulé'}
          </span>
          <span className="font-medium">{timeText}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-text-muted/40" style={{ width: `${Math.round((timing.elapsed ?? 0) * 100)}%` }} />
        </div>
      </div>

      <div className="flex-1 space-y-3.5 px-5 py-4">
        {metrics.length ? (
          metrics
            .filter((m) => !m.collection)
            .map((m) => <MetricRow key={m.key} m={m} elapsed={timing.phase === 'active' ? timing.elapsed : null} />)
        ) : (
          <p className="text-sm text-text-muted">Aucune cible définie.</p>
        )}
        <div className="space-y-3.5 border-t border-dashed border-border pt-3.5">
          <CollectionRows collection={actuals ? actuals.collection : undefined} target={goal.targetCollection} />
        </div>
      </div>

      <footer className="flex items-center justify-end gap-1.5 border-t border-border px-4 py-2.5">
        {confirming ? (
          <>
            <span className="mr-auto text-xs text-text-muted">Supprimer cet objectif ?</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text-strong"
            >
              Annuler
            </button>
            <button data-write=""
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete(goal);
                } finally {
                  setDeleting(false);
                  setConfirming(false);
                }
              }}
              className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </>
        ) : (
          <>
            <button data-write=""
              type="button"
              onClick={() => onEdit(goal)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-strong transition hover:border-border-strong"
            >
              <PencilIcon size={12} />
              Modifier
            </button>
            <button data-write=""
              type="button"
              onClick={() => setConfirming(true)}
              title="Supprimer"
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon size={13} />
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

export default function GoalsSection() {
  const [goals, setGoals] = useState([]);
  const [sources, setSources] = useState(null); // data the results are computed from
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(null); // null until data decides the default
  const [editing, setEditing] = useState(null); // {} = new goal, goal = edit

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const [fetchedGoals, fetchedSources] = await Promise.all([fetchGoals(), fetchGoalSources()]);
      setGoals(fetchedGoals.filter(isRealGoal));
      setSources(fetchedSources);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Impossible de charger les objectifs');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withStatus = useMemo(
    () =>
      goals
        .map((g) => {
          const actuals = computeGoalActuals(g, sources);
          return { goal: g, actuals, phase: goalStatus(g, actuals).timing.phase };
        })
        .sort((a, b) => (b.goal.startDate || '').localeCompare(a.goal.startDate || '')),
    [goals, sources]
  );
  const counts = useMemo(() => {
    const c = { active: 0, upcoming: 0, ended: 0, all: withStatus.length };
    withStatus.forEach(({ phase }) => {
      c[phase] += 1;
    });
    return c;
  }, [withStatus]);

  // Default to the current goals when there are any.
  const activeFilter = filter ?? (counts.active ? 'active' : 'all');
  const visible = withStatus.filter(({ phase }) => activeFilter === 'all' || phase === activeFilter);

  const handleSave = async (form) => {
    if (editing?.id) {
      const saved = await updateGoal(editing.id, form);
      setGoals((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
    } else {
      const saved = await createGoal(form);
      setGoals((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = async (goal) => {
    await deleteGoal(goal.id);
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeFilter === f.id ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-strong'
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  activeFilter === f.id ? 'bg-white/20' : 'bg-canvas text-text-muted'
                }`}
              >
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <button data-write=""
          type="button"
          onClick={() => setEditing({})}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <PlusIcon size={14} />
          Nouvel objectif
        </button>
      </div>

      <div className="mt-4">
        {status === 'error' ? (
          <ErrorState message={error} onRetry={load} />
        ) : status === 'loading' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-[320px] rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <p className="text-3xl">🎯</p>
            <p className="mt-2 text-sm font-medium text-text-strong">
              {goals.length ? 'Aucun objectif dans cette catégorie' : 'Aucun objectif pour le moment'}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Fixe des cibles de leads, prospects, candidates ou de chiffre d’affaires pour une période.
            </p>
            <button data-write=""
              type="button"
              onClick={() => setEditing({})}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <PlusIcon size={14} />
              Créer un objectif
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ goal, actuals }) => (
              <GoalCard key={goal.id} goal={goal} actuals={actuals} onEdit={setEditing} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <GoalModal goal={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </section>
  );
}
