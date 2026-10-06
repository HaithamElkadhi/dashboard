import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import ProspectsTable from '../components/ProspectsTable.jsx';
import ProspectEditModal from '../components/prospects/ProspectEditModal.jsx';
import ScholarshipModal from '../components/prospects/ScholarshipModal.jsx';
import ProposalViewModal from '../components/prospects/ProposalViewModal.jsx';
import ClientFicheModal from '../components/prospects/ClientFicheModal.jsx';
import ContactLogModal from '../components/prospects/ContactLogModal.jsx';
import WhatsAppModal from '../components/prospects/WhatsAppModal.jsx';
import SituationFilter from '../components/prospects/SituationFilter.jsx';
import Toast from '../components/Toast.jsx';
import { fetchProspectCompleteness, normalizeIntake, updateInterestLevel } from '../lib/airtable.js';
import { ErrorState } from '../components/states.jsx';
import { SITUATION_CHOICES, ADMITTED_SITUATION } from '../lib/config.js';
import { chipStyle } from '../lib/colors.js';
import { formatEUR, formatTND } from '../lib/format.js';
import { RefreshIcon, SearchIcon } from '../components/icons.jsx';

// Situation tab pinned first / last regardless of the Airtable option order.
const FIRST_SITUATION_TAB = 'Lead';
const LAST_SITUATION_TAB = 'Lost';

const UNKNOWN = 'Unknown';

// On these tabs the row action is "Proposal" instead of "Bourse" — scholarship
// work only starts once the student has signed.
const PROPOSAL_TABS = ['Lead', 'Prospect'];

// School-year filter (Intended Intake), available on every tab.
const NO_INTAKE = '__none__';

// Admission filter — only on the Candidate tab (admission work starts there).
const ADMISSION_TAB = 'Candidate';
const NO_ADMISSION = '__none__';

function inTab(p, tab) {
  if (tab === 'all') return true;
  if (tab === UNKNOWN) return p.situations.length === 0;
  return p.situations.includes(tab);
}

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
  const { prospects, schema, status, error, lastUpdated, activityWarnings, refresh, update, remove, patchLocal } =
    useDashboardData();
  usePageRefreshRegistration({ lastUpdated, refresh, loading: status === 'loading' });
  const [searchParams, setSearchParams] = useSearchParams();
  // Active situation tab — 'all' shows everyone; otherwise filter by that situation.
  const [activeTab, setActiveTab] = useState('all');
  const [proposalFor, setProposalFor] = useState(null);
  const [ficheFor, setFicheFor] = useState(null);
  const [contactFor, setContactFor] = useState(null);
  const [whatsappFor, setWhatsappFor] = useState(null);
  const [intakeFilter, setIntakeFilter] = useState('all');
  const [admissionFilter, setAdmissionFilter] = useState('all');
  // Tous tab only: combine several situations (empty = all).
  const [situationFilter, setSituationFilter] = useState([]);
  const isProposalTab = PROPOSAL_TABS.includes(activeTab);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [bourseEditing, setBourseEditing] = useState(null);
  const [toast, setToast] = useState('');

  // Année scolaire options: one per year, saved as an EXISTING Airtable option
  // (Airtable has "26 - 27 " and "2026/2027" style duplicates).
  const intakeOptionByYear = useMemo(() => {
    const byYear = new Map();
    (schema?.intake?.order || []).forEach((raw) => {
      const year = normalizeIntake(raw);
      if (!year) return;
      const current = byYear.get(year);
      if (!current || (raw.includes('/') && !current.includes('/'))) byYear.set(year, raw);
    });
    return byYear;
  }, [schema]);
  const intakeYears = useMemo(() => [...intakeOptionByYear.keys()].sort(), [intakeOptionByYear]);

  // Inline edits from the table: shown at once, rolled back if Airtable refuses.
  const saveInline = async (p, localPatch, input, previous, errorMsg) => {
    patchLocal(p.id, localPatch);
    try {
      await update(p.id, input);
    } catch (err) {
      patchLocal(p.id, previous);
      showToast(err.message || errorMsg);
    }
  };

  const handleIntakeChange = (p, years) => {
    const raw = years.map((y) => intakeOptionByYear.get(y) || y);
    saveInline(
      p,
      { intakes: years, intakeRaw: raw },
      { intendedIntake: raw },
      { intakes: p.intakes, intakeRaw: p.intakeRaw },
      "Impossible d'enregistrer l'année scolaire"
    );
  };

  const handleDateChange = (p, field, value) => {
    saveInline(p, { [field]: value }, { [field]: value || null }, { [field]: p[field] }, "Impossible d'enregistrer la date");
  };

  // Optimistic: show the new level at once, roll back if Airtable refuses.
  const handleInterestChange = async (p, value) => {
    const previous = p.interestLevel || '';
    patchLocal(p.id, { interestLevel: value });
    try {
      await updateInterestLevel(p.id, value);
    } catch (err) {
      patchLocal(p.id, { interestLevel: previous });
      showToast(err.message || "Impossible d'enregistrer le niveau d'intérêt");
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  // Deep-link from Booking (and elsewhere): /prospects?open=<recordId>
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;

    // Wait for student data, keeping the link intact if loading fails.
    if (status !== 'ready') return;

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
      if (p.situations.includes(ADMITTED_SITUATION)) admis += 1;
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
      intake: schema?.intake?.order || [],
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

  // Tabs: Lead first, then schema order, any extra situations present in data,
  // Unknown, and Lost always last.
  const situationTabs = useMemo(() => {
    const ordered = [
      ...situationOrder.filter((s) => s === FIRST_SITUATION_TAB),
      ...situationOrder.filter((s) => s !== FIRST_SITUATION_TAB && s !== LAST_SITUATION_TAB),
    ];
    const extras = Object.keys(situationCounts).filter(
      (c) =>
        c !== UNKNOWN &&
        c !== LAST_SITUATION_TAB &&
        !situationOrder.includes(c) &&
        situationCounts[c] > 0
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
    if (situationOrder.includes(LAST_SITUATION_TAB) || situationCounts[LAST_SITUATION_TAB] > 0) {
      tabs.push({
        id: LAST_SITUATION_TAB,
        label: LAST_SITUATION_TAB,
        count: situationCounts[LAST_SITUATION_TAB] || 0,
        color: chipStyle(situationColors[LAST_SITUATION_TAB]),
      });
    }
    return tabs;
  }, [situationOrder, situationCounts, situationColors]);

  // School years present in the current tab (+ how many have none), newest first.
  const intakeOptions = useMemo(() => {
    const counts = {};
    let none = 0;
    for (const p of prospects) {
      if (!inTab(p, activeTab)) continue;
      const intakes = p.intakes || [];
      if (!intakes.length) none += 1;
      intakes.forEach((y) => {
        counts[y] = (counts[y] || 0) + 1;
      });
    }
    const years = Object.keys(counts)
      .sort((a, b) => b.localeCompare(a))
      .map((y) => ({ id: y, label: y, count: counts[y] }));
    if (none) years.push({ id: NO_INTAKE, label: 'Non renseigné', count: none });
    return years;
  }, [prospects, activeTab]);

  // Admission statuses among the tab's prospects, in Airtable's option order
  // (+ how many have none). Only used on the Candidate tab.
  const admissionOptions = useMemo(() => {
    if (activeTab !== ADMISSION_TAB) return [];
    const counts = {};
    let none = 0;
    for (const p of prospects) {
      if (!inTab(p, activeTab)) continue;
      if (intakeFilter !== 'all') {
        const intakes = p.intakes || [];
        if (intakeFilter === NO_INTAKE ? intakes.length : !intakes.includes(intakeFilter)) continue;
      }
      if (!p.admissionStatus.length) none += 1;
      p.admissionStatus.forEach((a) => {
        counts[a] = (counts[a] || 0) + 1;
      });
    }
    const order = schema?.admission?.order || [];
    const names = [
      ...order.filter((a) => counts[a]),
      ...Object.keys(counts).filter((a) => !order.includes(a)),
    ];
    const opts = names.map((a) => ({ id: a, label: a, count: counts[a] }));
    if (none) opts.push({ id: NO_ADMISSION, label: 'Aucun statut', count: none });
    return opts;
  }, [prospects, activeTab, intakeFilter, schema]);

  // The Admission filter is only visible on Candidate — clear it when leaving
  // so it never filters another tab silently.
  useEffect(() => {
    if (activeTab !== ADMISSION_TAB) setAdmissionFilter('all');
    if (activeTab !== 'all') setSituationFilter([]);
  }, [activeTab]);

  // Keep active tab valid if situations change after a refresh.
  useEffect(() => {
    if (activeTab === 'all') return;
    if (!situationTabs.some((t) => t.id === activeTab)) setActiveTab('all');
  }, [activeTab, situationTabs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prospects.filter((p) => {
      if (!inTab(p, activeTab)) return false;
      if (activeTab === 'all' && situationFilter.length) {
        if (!situationFilter.some((s) => inTab(p, s))) return false;
      }
      if (intakeFilter !== 'all') {
        const intakes = p.intakes || [];
        const matchesIntake =
          intakeFilter === NO_INTAKE ? intakes.length === 0 : intakes.includes(intakeFilter);
        if (!matchesIntake) return false;
      }
      if (admissionFilter !== 'all') {
        const matchesAdmission =
          admissionFilter === NO_ADMISSION
            ? p.admissionStatus.length === 0
            : p.admissionStatus.includes(admissionFilter);
        if (!matchesAdmission) return false;
      }
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.prospectId.toLowerCase().includes(q)
      );
    });
  }, [prospects, activeTab, situationFilter, intakeFilter, admissionFilter, query]);

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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeTab === 'all' && (
            <SituationFilter options={situationTabs} value={situationFilter} onChange={setSituationFilter} />
          )}
          <label
            className={`inline-flex items-center gap-2 rounded-xl border bg-surface py-1 pl-3 pr-1 text-sm transition ${
              intakeFilter === 'all' ? 'border-border' : 'border-brand'
            }`}
          >
            <span className="whitespace-nowrap text-text-muted">Année scolaire</span>
            <select
              value={intakeFilter}
              onChange={(e) => setIntakeFilter(e.target.value)}
              className="cursor-pointer rounded-lg bg-transparent py-1.5 pr-1 text-sm font-medium text-text-strong outline-none"
            >
              <option value="all">Toutes</option>
              {/* Keep the chosen year listed even if the current tab has none. */}
              {intakeFilter !== 'all' && !intakeOptions.some((o) => o.id === intakeFilter) && (
                <option value={intakeFilter}>
                  {intakeFilter === NO_INTAKE ? 'Non renseigné' : intakeFilter} (0)
                </option>
              )}
              {intakeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </label>
          {activeTab === ADMISSION_TAB && (
            <label
              className={`inline-flex items-center gap-2 rounded-xl border bg-surface py-1 pl-3 pr-1 text-sm transition ${
                admissionFilter === 'all' ? 'border-border' : 'border-brand'
              }`}
            >
              <span className="whitespace-nowrap text-text-muted">Admission</span>
              <select
                value={admissionFilter}
                onChange={(e) => setAdmissionFilter(e.target.value)}
                className="cursor-pointer rounded-lg bg-transparent py-1.5 pr-1 text-sm font-medium text-text-strong outline-none"
              >
                <option value="all">Tous</option>
                {admissionFilter !== 'all' && !admissionOptions.some((o) => o.id === admissionFilter) && (
                  <option value={admissionFilter}>
                    {admissionFilter === NO_ADMISSION ? 'Aucun statut' : admissionFilter} (0)
                  </option>
                )}
                {admissionOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({opt.count})
                  </option>
                ))}
              </select>
            </label>
          )}
          {(intakeFilter !== 'all' || admissionFilter !== 'all' || situationFilter.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setIntakeFilter('all');
                setAdmissionFilter('all');
                setSituationFilter([]);
              }}
              className="text-xs font-medium text-text-muted underline-offset-2 transition hover:text-text-strong hover:underline"
            >
              Effacer
            </button>
          )}
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
          {activityWarnings.length > 0 && <p role="alert" className="mb-3 text-xs text-amber-800">{activityWarnings.join(" ")}</p>}
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
              proposalMode={isProposalTab}
              colors={{
                situation: schema?.situation?.colors,
                scholarship: schema?.scholarship?.colors,
                visa: schema?.visa?.colors,
                admission: schema?.admission?.colors,
                universitaly: schema?.universitaly?.colors,
              }}
              onEdit={setEditing}
              onDelete={handleDelete}
              onBourse={isProposalTab ? undefined : setBourseEditing}
              onProposal={isProposalTab ? setProposalFor : undefined}
              onFiche={isProposalTab ? setFicheFor : undefined}
              onContact={setContactFor}
              onInterest={handleInterestChange}
              onWhatsApp={setWhatsappFor}
              onIntakeChange={handleIntakeChange}
              onDateChange={handleDateChange}
              intakeYears={intakeYears}
            />
          )}
        </div>
      </div>

      {whatsappFor && (
        <WhatsAppModal
          prospect={whatsappFor}
          onClose={() => setWhatsappFor(null)}
          onSaved={(id, patch) => {
            patchLocal(id, patch);
            showToast('Numéro WhatsApp enregistré');
          }}
        />
      )}

      {contactFor && (
        <ContactLogModal
          prospect={prospects.find(p => p.id === contactFor.id) || contactFor}
          onClose={() => setContactFor(null)}
          onSaved={(id, saved) => {
            patchLocal(id, saved);
            showToast('Contact ajouté à l’historique');
          }}
        />
      )}

      {ficheFor && (
        <ClientFicheModal
          prospect={ficheFor}
          onClose={() => setFicheFor(null)}
          onSaved={(fiche) =>
            patchLocal(fiche.id, {
              fullName: fiche.fullName,
              firstName: fiche.name,
              lastName: fiche.surname,
              photoUrl: fiche.photoUrl,
            })
          }
        />
      )}

      {proposalFor && (
        <ProposalViewModal
          prospect={proposalFor}
          onClose={() => setProposalFor(null)}
          onSaved={(id) =>
            fetchProspectCompleteness(id)
              .then((proposal) => patchLocal(id, { proposal }))
              .catch(() => {})
          }
        />
      )}

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
