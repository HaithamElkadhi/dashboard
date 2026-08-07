export default function ProgressWidget({ stats }) {
  const total = stats.total || 1;
  const pct = Math.round((stats.completed / total) * 100);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-strong">Progression</h3>
      <div className="mt-3 flex items-baseline justify-between text-sm">
        <span className="tabular-nums text-text-muted">
          {stats.completed}/{stats.total}
        </span>
        <span className="font-semibold tabular-nums text-text-strong">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {stats.total === 0
          ? 'Aucune tâche pour le moment.'
          : pct === 100
            ? 'Toutes les tâches sont terminées — beau travail.'
            : `Encore ${stats.total - stats.completed} tâche${
                stats.total - stats.completed > 1 ? 's' : ''
              } avant d’être à jour.`}
      </p>
    </section>
  );
}
