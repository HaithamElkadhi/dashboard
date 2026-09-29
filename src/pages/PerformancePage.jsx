import { useMemo, useState } from 'react';
import { useKpisData } from '../hooks/useKpisData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { KPI_METRICS } from '../lib/kpiMetrics.js';
import { ErrorState } from '../components/states.jsx';
import StatusTrendChart from '../components/performance/StatusTrendChart.jsx';
import GoalsSection from '../components/performance/GoalsSection.jsx';

const VIEWS = [
  { id: 'goals', label: '🎯 Objectifs' },
  { id: 'pipeline', label: '📈 Suivi du pipeline' },
];

function fullDate(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetricTile({ metric, value, delta, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
        active
          ? 'border-transparent bg-canvas ring-2 ring-brand'
          : 'border-border bg-surface hover:border-border-strong'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: metric.color }}
        />
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
          {metric.label}
        </p>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-text-strong sm:text-2xl">
        {value}
      </p>
      {delta != null && (
        <p className="mt-0.5 text-xs tabular-nums text-text-muted">
          {delta === 0 ? '±0' : delta > 0 ? `+${delta}` : delta} depuis la mise à jour précédente
        </p>
      )}
    </button>
  );
}

export default function PerformancePage() {
  const { snapshots, status, error, lastUpdated, refresh } = useKpisData();
  usePageRefreshRegistration({ lastUpdated, refresh, loading: status === 'loading' });

  const [selectedKey, setSelectedKey] = useState('totalProspect');
  const [view, setView] = useState('goals');

  const latest = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const selectedMetric = useMemo(
    () => KPI_METRICS.find((m) => m.key === selectedKey) || KPI_METRICS[0],
    [selectedKey]
  );

  const loading = status === 'loading' && snapshots.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-surface p-1 sm:inline-flex">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
              view === v.id ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-strong'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'goals' && <GoalsSection />}

      {view === 'pipeline' && (
        <>
          {status === 'error' && (
            <div className="mb-4">
              <ErrorState message={error} onRetry={refresh} />
            </div>
          )}

          <section>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-text-strong">Dernière mise à jour</h2>
              {latest && (
                <span className="text-xs text-text-muted">{fullDate(new Date(latest.date))}</span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="skeleton h-[84px] rounded-2xl" />
                  ))
                : KPI_METRICS.map((metric) => (
                    <MetricTile
                      key={metric.key}
                      metric={metric}
                      value={latest ? latest[metric.key] : '—'}
                      delta={
                        latest && previous ? latest[metric.key] - previous[metric.key] : null
                      }
                      active={selectedKey === metric.key}
                      onClick={() => setSelectedKey(metric.key)}
                    />
                  ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text-strong">Courbe par statut</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Choisis un statut ci-dessus pour voir son évolution dans le temps.
              </p>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="skeleton h-[260px] w-full rounded-lg" />
              ) : (
                <StatusTrendChart snapshots={snapshots} metric={selectedMetric} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
