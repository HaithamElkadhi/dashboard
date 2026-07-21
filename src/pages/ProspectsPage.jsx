import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData.js';
import ProspectsTable from '../components/ProspectsTable.jsx';
import { ErrorState } from '../components/states.jsx';
import { SITUATION_CHOICES } from '../lib/config.js';
import { chipStyle } from '../lib/colors.js';
import { formatEUR, formatTND } from '../lib/format.js';

const UNKNOWN = 'Unknown';

function KPICard({ label, value, loading }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-text-strong">
        {loading ? <span className="text-text-muted">—</span> : value}
      </p>
    </div>
  );
}

function MoneyKPICard({ label, eur, tnd, loading }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      {loading ? (
        <p className="mt-1.5 text-2xl font-semibold text-text-muted">—</p>
      ) : (
        <div className="mt-1.5 flex flex-col leading-tight">
          <span className="text-2xl font-semibold tabular-nums text-text-strong">
            {formatEUR(eur)}
          </span>
          <span className="mt-0.5 text-2xl font-semibold tabular-nums text-text-strong">
            {formatTND(tnd)}
          </span>
        </div>
      )}
    </div>
  );
}

function PhasePill({ label, count, active, color, onClick }) {
  const style = active && color ? { backgroundColor: color.bg, color: color.text } : undefined;
  return (
    <button
      onClick={onClick}
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-transparent shadow-sm'
          : 'border-border bg-surface text-text-strong hover:border-border-strong'
      } ${active && !color ? 'bg-brand text-white' : ''}`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-xs tabular-nums ${
          active ? 'bg-black/10' : 'bg-canvas text-text-muted'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function ProspectsPage() {
  const { prospects, schema, status, error, lastUpdated, refresh } =
    useDashboardData();
  const [selected, setSelected] = useState([]); // empty = "Tous"
  const [query, setQuery] = useState('');

  const toggleFilter = (choice) => {
    setSelected((prev) =>
      prev.includes(choice)
        ? prev.filter((c) => c !== choice)
        : [...prev, choice]
    );
  };

  const loading = status === 'loading';
  const kpiLoading = loading || status === 'idle';

  const kpis = useMemo(() => {
    let admis = 0;
    for (const p of prospects) {
      if (p.situations.includes('Admitted')) admis += 1;
    }
    return { total: prospects.length, admis };
  }, [prospects]);

  // Situation choices + colors come from the Airtable schema (fully dynamic).
  // Fall back to a static list if the schema couldn't be loaded.
  const situationOrder = useMemo(
    () =>
      schema?.situation?.order?.length
        ? schema.situation.order
        : SITUATION_CHOICES,
    [schema]
  );
  const situationColors = schema?.situation?.colors || {};

  const situationCounts = useMemo(() => {
    const counts = {};
    let unknown = 0;
    for (const p of prospects) {
      if (p.situations.length === 0) unknown += 1;
      for (const s of p.situations) {
        counts[s] = (counts[s] || 0) + 1;
      }
    }
    counts[UNKNOWN] = unknown;
    return counts;
  }, [prospects]);

  // Show pills in schema order, then any values present in data but not in the
  // schema, keeping everything driven by the live data. Only non-empty ones.
  const activeChoices = useMemo(() => {
    const ordered = situationOrder.filter((c) => situationCounts[c] > 0);
    const extras = Object.keys(situationCounts).filter(
      (c) => c !== UNKNOWN && !situationOrder.includes(c) && situationCounts[c] > 0
    );
    return [...ordered, ...extras];
  }, [situationOrder, situationCounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prospects.filter((p) => {
      const matchesFilter =
        selected.length === 0 ||
        p.situations.some((s) => selected.includes(s)) ||
        (selected.includes(UNKNOWN) && p.situations.length === 0);
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.prospectId.toLowerCase().includes(q)
      );
    });
  }, [prospects, selected, query]);

  // Payé / Restant follow the current filters + search, not the whole dataset.
  const moneyKpis = useMemo(() => {
    let eurPaid = 0;
    let tndPaid = 0;
    let eurDue = 0;
    let tndDue = 0;
    for (const p of filtered) {
      eurPaid += p.pay.eurPaid;
      tndPaid += p.pay.tndPaid;
      eurDue += p.pay.eurDue;
      tndDue += p.pay.tndDue;
    }
    return { eurPaid, tndPaid, eurDue, tndDue };
  }, [filtered]);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-text-strong transition hover:border-border-strong"
            >
              ← Back
            </Link>
            <h1 className="text-base font-semibold text-text-strong">
              JEExpert — Client Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-text-muted sm:inline">
                Mis à jour{' '}
                {lastUpdated.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard label="Total Clients" value={kpis.total} loading={kpiLoading} />
          <KPICard label="Admis" value={kpis.admis} loading={kpiLoading} />
          <MoneyKPICard
            label="Payé"
            eur={moneyKpis.eurPaid}
            tnd={moneyKpis.tndPaid}
            loading={kpiLoading}
          />
          <MoneyKPICard
            label="Restant"
            eur={moneyKpis.eurDue}
            tnd={moneyKpis.tndDue}
            loading={kpiLoading}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <PhasePill
            label="Tous"
            count={prospects.length}
            active={selected.length === 0}
            onClick={() => setSelected([])}
          />
          {activeChoices.map((choice) => (
            <PhasePill
              key={choice}
              label={choice}
              count={situationCounts[choice]}
              active={selected.includes(choice)}
              color={chipStyle(situationColors[choice])}
              onClick={() => toggleFilter(choice)}
            />
          ))}
          {situationCounts[UNKNOWN] > 0 && (
            <PhasePill
              label="Unknown"
              count={situationCounts[UNKNOWN]}
              active={selected.includes(UNKNOWN)}
              color={{ bg: '#F1EFE8', text: '#5F5E5A' }}
              onClick={() => toggleFilter(UNKNOWN)}
            />
          )}
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="ml-1 text-sm font-medium text-text-muted underline-offset-2 transition hover:text-text-strong hover:underline"
            >
              Effacer ({selected.length})
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="relative max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou ID prospect…"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
            />
          </div>
        </div>

        {status === 'error' && (
          <ErrorState message={error} onRetry={refresh} />
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm text-text-muted">
              {status === 'idle'
                ? 'Aucune donnée chargée'
                : loading
                  ? 'Chargement…'
                  : `${filtered.length} client${filtered.length > 1 ? 's' : ''}`}
            </span>
          </div>
          {status === 'idle' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-medium text-text-muted">
                Aucune donnée chargée. Cliquez sur « Refresh » pour charger les
                clients depuis Airtable.
              </p>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <span>↻</span>
                Charger les données
              </button>
            </div>
          ) : (
            <ProspectsTable
              rows={filtered}
              loading={loading}
              colors={{
                situation: schema?.situation?.colors,
                scholarship: schema?.scholarship?.colors,
                visa: schema?.visa?.colors,
                admission: schema?.admission?.colors,
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
