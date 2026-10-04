import { Link } from 'react-router-dom';
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

function WorkspaceLinks() {
  return <section className="rounded-2xl border border-border bg-surface p-6">
    <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Workspace</p>
    <h2 className="mt-2 text-lg font-semibold text-navy">Quick access</h2>
    <p className="mt-2 text-sm text-text-muted">Open your records, tasks and visa resources.</p>
    <div className="mt-6 grid gap-3">
      {[['/prospects', 'Students'], ['/tasks', 'My Tasks'], ['/visa', 'Visa guide']].map(([path, label]) => <Link key={path} to={path} className="flex min-h-11 items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-navy transition hover:border-navy hover:bg-canvas">{label}<span aria-hidden="true">→</span></Link>)}
    </div>
  </section>;
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
    <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
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
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[[ 'Student records', dash.prospects.length, dash.status ], ['Due payments', pending.length, finance.status], ['Scholarship deadlines', upcoming.length, dash.status]].map(([label, value, status]) => <section key={label} className="rounded-2xl border border-border bg-surface p-6"><p className="text-sm text-text-muted">{label}</p>{status === 'loading' ? <div className="skeleton mt-3 h-10 w-20 rounded-lg" aria-label="Loading" /> : <p className="mt-3 text-3xl font-semibold tabular-nums text-navy">{status === 'error' ? '—' : value}</p>}</section>)}
          </div>
          <div className="grid auto-rows-[360px] grid-cols-1 gap-6 xl:grid-cols-2">
          <ScholarshipAlertBlock items={upcoming} loading={dash.status === 'loading'} />
          <PendingPaiementsBlock items={pending} loading={finance.status === 'loading'} />
          <PendingStudentsBlock items={students} loading={dash.status === 'loading'} />
          <WorkspaceLinks />
          </div>
        </div>
      )}
    </div>
  );
}
