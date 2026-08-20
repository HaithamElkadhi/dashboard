import { useDashboardData } from '../hooks/useDashboardData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { prospectsWithUpcomingScholarshipDDL } from '../lib/scholarshipAlerts.js';
import ScholarshipAlertBlock from '../components/home/ScholarshipAlertBlock.jsx';
import { ErrorState } from '../components/states.jsx';
import { RefreshIcon } from '../components/icons.jsx';

function EmptySlot() {
  return (
    <div className="min-h-[220px] rounded-2xl border border-dashed border-border bg-surface/60" />
  );
}

export default function HomePage() {
  const { prospects, status, error, lastUpdated, refresh } = useDashboardData();
  usePageRefreshRegistration({ lastUpdated, refresh, loading: status === 'loading' });

  const loading = status === 'loading';
  const upcoming = prospectsWithUpcomingScholarshipDDL(prospects);

  return (
    <div className="mx-auto h-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      {status === 'error' && <ErrorState message={error} onRetry={refresh} />}

      {status === 'idle' ? (
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface text-center">
          <RefreshIcon size={26} className="text-text-muted" />
          <p className="max-w-sm text-sm text-text-muted">
            Charge les clients pour afficher les alertes.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <RefreshIcon size={14} />
            Charger les données
          </button>
        </div>
      ) : (
        <div className="grid h-full min-h-[480px] grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2">
          <ScholarshipAlertBlock items={upcoming} loading={loading} />
          <EmptySlot />
          <EmptySlot />
          <EmptySlot />
        </div>
      )}
    </div>
  );
}
