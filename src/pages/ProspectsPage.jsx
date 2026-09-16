import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import ProspectsTable from '../components/ProspectsTable.jsx';
import ProspectEditModal from '../components/prospects/ProspectEditModal.jsx';
import ScholarshipModal from '../components/prospects/ScholarshipModal.jsx';
import Toast from '../components/Toast.jsx';
import { ErrorState } from '../components/states.jsx';
import { SITUATION_CHOICES } from '../lib/config.js';
import { chipStyle } from '../lib/colors.js';
import { formatEUR, formatTND } from '../lib/format.js';
import { RefreshIcon, SearchIcon } from '../components/icons.jsx';

const UNKNOWN = 'Unknown';

function KPICard({ label, value, loading }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-text-strong sm:text-2xl">
        {loading ? <span className="text-text-muted">—</span> : value}
      </p>
    </div>
  );
}

function MoneyKPICard({ label, eur, tnd, loading }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
        {label}
      </p>
      {loading ? (
        <p className="mt-1.5 text-xl font-semibold text-text-muted sm:text-2xl">—</p>
      ) : (
        <div className="mt-1.5 flex flex-col leading-tight">
          <span className="text-xl font-semibold tabular-nums text-text-strong sm:text-2xl">
            {formatEUR(eur)}
          </span>
          <span className="mt-0.5 text-xl font-semibold tabular-nums text-text-strong sm:text-2xl">
            {formatTND(tnd)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProspectsPage() {
  const { prospects, schema, status, error, lastUpdated, refresh, update, remove } =
    useDashboardData();
  usePageRefreshRegistration({ lastUpdated, refresh, loading: status === 'loading' });
  const [searchParams, setSearchParams] = useSearchParams();
  // Active situation tab — 'all' shows everyone; otherwise filter by that situation.
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [bourseEditing, setBourseEditing] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  // Deep-link from Booking (and elsewhere): /prospects?open=<recordId>
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;

    if (status === 'idle') {
      refresh();
      return;
    }
    if (status === 'loading') return;

    const match = prospects.find((p) => p.id === openId);
    if (match) setEditing(match);
    else if (status === 'ready') showToast('Prospect introuvable');

    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, prospects, status]);

  const handleDelete = async (prospect) => {
    const ok = window.confirm(
      `Supprimer « ${prospect.fullName || prospect.prospectId} » ? Cette action est définitive.`
    );
    if (!ok) return;
    try {
      await remove(prospect.id);
      showToast('Prospect supprimé');
    } catch (err) {
      showToast(err.message || 'Suppression impossible');
    }
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

  const editChoices = useMemo(
    () => ({
      situation: situationOrder,
      admission: schema?.admission?.order || [],
      scholarship: schema?.scholarship?.order || [],
      visa: schema?.visa?.order || [],
      universitaly: schema?.universitaly?.order || [],
      scholarshipType: schema?.scholarshipType?.order || [],
      scholarshipPayment: schema?.scholarshipPayment?.order || [],
      regionAuthority: schema?.regionAuthority?.order || [],
    }),
    [situationOrder, schema]
  );

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

  // Tabs: schema order, then any extra situations present in data, then Unknown.
  const situationTabs = useMemo(() => {
    const ordered = situationOrder.slice();
    const extras = Object.keys(situationCounts).filter(
      (c) => c !== UNKNOWN && !situationOrder.includes(c) && situationCounts[c] > 0
    );
    const tabs = [...ordered, ...extras].map((name) => ({
      id: name,
      label: name,
      count: situationCounts[name] || 0,
      color: chipStyle(situationColors[name]),
    }));
    if (situationCounts[UNKNOWN] > 0) {
      tabs.push({
        id: UNKNOWN,
        label: 'Unknown',
        count: situationCounts[UNKNOWN],
        color: { bg: '#F1EFE8', text: '#5F5E5A' },
      });
    }
    return tabs;
  }, [situationOrder, situationCounts, situationColors]);

  // Keep active tab valid if situations change after a refresh.
  useEffect(() => {
    if (activeTab === 'all') return;
    if (!situationTabs.some((t) => t.id === activeTab)) setActiveTab('all');
  }, [activeTab, situationTabs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prospects.filter((p) => {
      let matchesTab = true;
      if (activeTab === UNKNOWN) {
        matchesTab = p.situations.length === 0;
      } else if (activeTab !== 'all') {
        matchesTab = p.situations.includes(activeTab);
      }
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.prospectId.toLowerCase().includes(q)
      );
    });
  }, [prospects, activeTab, query]);

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
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      <div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
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

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-full overflow-x-auto scroll-thin">
            <div className="inline-flex min-w-min gap-1 rounded-xl border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:text-text-strong'
                }`}
              >
                Tous
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    activeTab === 'all' ? 'bg-black/15' : 'bg-canvas text-text-muted'
                  }`}
                >
                  {prospects.length}
                </span>
              </button>
              {situationTabs.map((tab) => {
                const active = activeTab === tab.id;
                const style =
                  active && tab.color
                    ? { backgroundColor: tab.color.bg, color: tab.color.text }
                    : undefined;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={style}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'shadow-sm'
                        : 'text-text-muted hover:text-text-strong'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 text-xs tabular-nums ${
                        active ? 'bg-black/10' : 'bg-canvas text-text-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative w-full max-w-sm shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <SearchIcon size={15} />
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
              <RefreshIcon size={26} className="text-text-muted" />
              <p className="text-sm font-medium text-text-muted">
                Aucune donnée chargée. Cliquez pour charger les clients depuis
                Airtable.
              </p>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <RefreshIcon size={14} />
                Charger les données
              </button>
            </div>
          ) : (
            <ProspectsTable
              rows={filtered}
              loading={loading}
              showSituation={activeTab === 'all'}
              colors={{
                situation: schema?.situation?.colors,
                scholarship: schema?.scholarship?.colors,
                visa: schema?.visa?.colors,
                admission: schema?.admission?.colors,
                universitaly: schema?.universitaly?.colors,
              }}
              onEdit={setEditing}
              onDelete={handleDelete}
              onBourse={setBourseEditing}
            />
          )}
        </div>
      </div>

      {editing && (
        <ProspectEditModal
          prospect={editing}
          choices={editChoices}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            await update(editing.id, payload);
            showToast('Prospect mis à jour');
          }}
        />
      )}

      {bourseEditing && (
        <ScholarshipModal
          prospect={bourseEditing}
          choices={editChoices}
          onClose={() => setBourseEditing(null)}
          onSubmit={async (payload) => {
            await update(bourseEditing.id, payload);
            showToast('Dossier Bourse mis à jour');
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
