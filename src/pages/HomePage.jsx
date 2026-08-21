import { useCallback } from 'react';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { useFinanceData } from '../hooks/useFinanceData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { prospectsWithUpcomingScholarshipDDL } from '../lib/scholarshipAlerts.js';
import { pendingPaiements } from '../lib/pendingPaiements.js';
import { pendingStudents } from '../lib/pendingStudents.js';
import ScholarshipAlertBlock from '../components/home/ScholarshipAlertBlock.jsx';
import PendingPaiementsBlock from '../components/home/PendingPaiementsBlock.jsx';
import PendingStudentsBlock from '../components/home/PendingStudentsBlock.jsx';
import { ErrorState } from '../components/states.jsx';
import { RefreshIcon } from '../components/icons.jsx';

function EmptySlot() {
  return (
    <div className="min-h-[220px] rounded-2xl border border-dashed border-border bg-surface/60" />
  );
}

export default function HomePage() {
  const dash = useDashboardData();
  const finance = useFinanceData();

  const refresh = useCallback(async () => {
    await Promise.all([dash.refresh(), finance.refresh()]);
  }, [dash.refresh, finance.refresh]);

  const loading = dash.status === 'loading' || finance.status === 'loading';
  const lastUpdated =
    [dash.lastUpdated, finance.lastUpdated]
      .filter(Boolean)
      .sort((a, b) => b - a)[0] ?? null;

  usePageRefreshRegistration({ lastUpdated, refresh, loading });

  const upcoming = prospectsWithUpcomingScholarshipDDL(dash.prospects);
  const pending = pendingPaiements(finance.paiements);
  const students = pendingStudents(dash.prospects);

  const idle = dash.status === 'idle' && finance.status === 'idle';
  const error = dash.error || finance.error;

  return (
    <div className="mx-auto h-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      {(dash.status === 'error' || finance.status === 'error') && (
        <ErrorState message={error} onRetry={refresh} />
      )}

      {idle ? (
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface text-center">
          <RefreshIcon size={26} className="text-text-muted" />
          <p className="max-w-sm text-sm text-text-muted">
            Charge les données pour afficher les alertes et paiements.
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
          <ScholarshipAlertBlock items={upcoming} loading={dash.status === 'loading'} />
          <PendingPaiementsBlock items={pending} loading={finance.status === 'loading'} />
          <PendingStudentsBlock items={students} loading={dash.status === 'loading'} />
          <EmptySlot />
        </div>
      )}
    </div>
  );
}
