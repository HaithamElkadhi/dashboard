import { useEffect, useMemo, useState } from 'react';
import { useAccountsData } from '../hooks/useAccountsData.js';
import { ErrorState } from '../components/states.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Toast from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import StatsCard from '../components/tasks/StatsCard.jsx';
import SituationBadge from '../components/accounts/SituationBadge.jsx';
import AccountRow from '../components/accounts/AccountRow.jsx';
import AccountForm from '../components/accounts/AccountForm.jsx';
import { relativeTime } from '../lib/taskDates.js';
import {
  KeyIcon,
  RefreshIcon,
  SearchIcon,
  UsersIcon,
} from '../components/icons.jsx';

const SCOPED_SITUATIONS = ['Engaged', 'Admitted'];
const EMAIL_CANDIDATURE = 'Email Candidature';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'admitted', label: 'Admis' },
  { value: 'engaged', label: 'Engagés' },
  { value: 'noAccount', label: 'Sans compte' },
  { value: 'emailNoDelegation', label: 'Email sans délégation' },
];

function isEmailSansDelegation(account) {
  return (
    account.labels.includes(EMAIL_CANDIDATURE) && !String(account.delegation || '').trim()
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-transparent bg-brand text-white shadow-sm'
          : 'border-border bg-surface text-text-strong hover:border-border-strong'
      }`}
    >
      {label}
    </button>
  );
}

function ProspectRow({ prospect, accountCount, active, onClick, needsDelegation }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
        active ? 'bg-brand/10' : 'hover:bg-canvas'
      }`}
    >
      <Avatar fullName={prospect.fullName} seed={prospect.fullName} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-strong">
          {prospect.fullName || '—'}
        </p>
        <p className="truncate text-xs text-text-muted">{prospect.prospectId || '—'}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {needsDelegation && (
            <span
              title="Email Candidature sans délégation"
              className="h-2 w-2 rounded-full bg-[#c47a12]"
            />
          )}
          <SituationBadge situations={prospect.situations} />
        </div>
        <span className="text-[11px] tabular-nums text-text-muted">
          {accountCount} compte{accountCount > 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}

export default function AccountsPage() {
  const {
    prospects,
    accounts,
    labelChoices,
    delegationChoices,
    status,
    error,
    lastUpdated,
    refresh,
    create,
    update,
    remove,
  } = useAccountsData();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const accountsByProspect = useMemo(() => {
    const map = new Map();
    for (const account of accounts) {
      for (const prospectId of account.prospectRecordIds) {
        if (!map.has(prospectId)) map.set(prospectId, []);
        map.get(prospectId).push(account);
      }
    }
    return map;
  }, [accounts]);

  const scopedProspects = useMemo(
    () =>
      prospects.filter((p) => p.situations.some((s) => SCOPED_SITUATIONS.includes(s))),
    [prospects]
  );

  const filteredProspects = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return scopedProspects
      .filter((p) => {
        const prospectAccounts = accountsByProspect.get(p.id) || [];
        const count = prospectAccounts.length;
        if (statusFilter === 'admitted' && !p.situations.includes('Admitted')) return false;
        if (statusFilter === 'engaged' && !p.situations.includes('Engaged')) return false;
        if (statusFilter === 'noAccount' && count > 0) return false;
        if (
          statusFilter === 'emailNoDelegation' &&
          !prospectAccounts.some(isEmailSansDelegation)
        ) {
          return false;
        }
        if (
          q &&
          !p.fullName.toLowerCase().includes(q) &&
          !p.prospectId.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
  }, [scopedProspects, accountsByProspect, statusFilter, debouncedQuery]);

  useEffect(() => {
    if (selectedId && filteredProspects.some((p) => p.id === selectedId)) return;
    setSelectedId(filteredProspects[0]?.id ?? null);
  }, [filteredProspects, selectedId]);

  const selectedProspect = scopedProspects.find((p) => p.id === selectedId) || null;
  const selectedAccounts = selectedProspect
    ? accountsByProspect.get(selectedProspect.id) || []
    : [];

  const accountGroups = useMemo(() => {
    const known = labelChoices;
    const extras = [];
    for (const account of selectedAccounts) {
      for (const label of account.labels) {
        if (!known.includes(label) && !extras.includes(label)) extras.push(label);
      }
    }
    const groups = [...known, ...extras]
      .map((label) => ({
        label,
        items: selectedAccounts.filter((a) => a.labels.includes(label)),
      }))
      .filter((g) => g.items.length > 0);
    const unlabeled = selectedAccounts.filter((a) => a.labels.length === 0);
    if (unlabeled.length > 0) groups.push({ label: 'Autre', items: unlabeled });
    return groups;
  }, [labelChoices, selectedAccounts]);

  const kpis = useMemo(() => {
    let withAccounts = 0;
    let emailNoDelegation = 0;
    for (const p of scopedProspects) {
      const prospectAccounts = accountsByProspect.get(p.id) || [];
      if (prospectAccounts.length > 0) withAccounts += 1;
      if (prospectAccounts.some(isEmailSansDelegation)) emailNoDelegation += 1;
    }
    return {
      total: scopedProspects.length,
      withAccounts,
      withoutAccounts: scopedProspects.length - withAccounts,
      emailNoDelegation,
    };
  }, [scopedProspects, accountsByProspect]);

  const handleAssign = async (formValues) => {
    if (!selectedProspect) return;
    const created = await create({
      mailUser: formValues.mailUser,
      label: formValues.label,
      password: formValues.password,
      link: formValues.link,
      delegation: formValues.delegation,
      prospectRecordId: selectedProspect.id,
    });
    showToast(created.mailUser ? `Compte assigné — ${created.mailUser}` : 'Compte assigné');
  };

  const handleUpdate = async (account, formValues) => {
    const updated = await update(account.id, {
      mailUser: formValues.mailUser,
      label: formValues.label,
      password: formValues.password,
      link: formValues.link,
      delegation: formValues.delegation,
    });
    showToast(updated.mailUser ? `Compte mis à jour — ${updated.mailUser}` : 'Compte mis à jour');
  };

  const handleDelete = async (account) => {
    const ok = window.confirm(
      `Supprimer le compte « ${account.mailUser || account.id} » ?`
    );
    if (!ok) return;
    try {
      await remove(account.id);
      showToast('Compte supprimé');
    } catch (err) {
      showToast(err.message || 'Suppression impossible');
    }
  };

  const loading = status === 'loading' && prospects.length === 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center justify-end">
        {lastUpdated && (
          <button
            type="button"
            onClick={refresh}
            disabled={status === 'loading'}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-surface disabled:opacity-60"
          >
            <RefreshIcon size={13} className={status === 'loading' ? 'animate-spin' : ''} />
            Mis à jour {relativeTime(lastUpdated)}
          </button>
        )}
      </div>

      {status === 'error' && (
        <div className="mb-4">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatsCard label="Étudiants actifs" value={kpis.total} icon={UsersIcon} />
        <StatsCard label="Avec comptes" value={kpis.withAccounts} icon={KeyIcon} tone="green" />
        <StatsCard
          label="Sans compte"
          value={kpis.withoutAccounts}
          icon={KeyIcon}
          tone={kpis.withoutAccounts > 0 ? 'gold' : 'default'}
          active={statusFilter === 'noAccount'}
          onClick={() =>
            setStatusFilter((f) => (f === 'noAccount' ? 'all' : 'noAccount'))
          }
        />
        <StatsCard
          label="Email sans délégation"
          value={kpis.emailNoDelegation}
          icon={KeyIcon}
          tone={kpis.emailNoDelegation > 0 ? 'gold' : 'default'}
          active={statusFilter === 'emailNoDelegation'}
          onClick={() =>
            setStatusFilter((f) =>
              f === 'emailNoDelegation' ? 'all' : 'emailNoDelegation'
            )
          }
        />
      </div>

      {loading ? (
        <div className="mt-5 space-y-2 rounded-2xl border border-border bg-surface p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="w-full space-y-3 lg:w-80 lg:shrink-0">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un étudiant…"
                className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <FilterPill
                  key={f.value}
                  label={f.label}
                  active={statusFilter === f.value}
                  onClick={() => setStatusFilter(f.value)}
                />
              ))}
            </div>

            <div className="space-y-1 rounded-2xl border border-border bg-surface p-2 lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto scroll-thin">
              {filteredProspects.length === 0 ? (
                <EmptyState
                  icon={SearchIcon}
                  title={
                    statusFilter === 'emailNoDelegation'
                      ? 'Aucun email sans délégation.'
                      : 'Aucun étudiant ne correspond.'
                  }
                  description={
                    statusFilter === 'emailNoDelegation'
                      ? 'Tous les comptes Email Candidature ont une délégation.'
                      : 'Essayez une autre recherche ou un autre filtre.'
                  }
                />
              ) : (
                filteredProspects.map((p) => {
                  const prospectAccounts = accountsByProspect.get(p.id) || [];
                  return (
                    <ProspectRow
                      key={p.id}
                      prospect={p}
                      accountCount={prospectAccounts.length}
                      needsDelegation={prospectAccounts.some(isEmailSansDelegation)}
                      active={p.id === selectedId}
                      onClick={() => setSelectedId(p.id)}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {!selectedProspect ? (
              <div className="rounded-2xl border border-border bg-surface">
                <EmptyState
                  icon={UsersIcon}
                  title="Sélectionnez un étudiant."
                  description="Choisissez un étudiant dans la liste pour voir et gérer ses comptes."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      fullName={selectedProspect.fullName}
                      seed={selectedProspect.fullName}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-text-strong">
                          {selectedProspect.fullName || '—'}
                        </h2>
                        <SituationBadge situations={selectedProspect.situations} />
                      </div>
                      <p className="text-xs text-text-muted">{selectedProspect.prospectId}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-muted">
                        {selectedProspect.email && <span>{selectedProspect.email}</span>}
                        {selectedProspect.phone && <span>{selectedProspect.phone}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedAccounts.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-surface">
                    <EmptyState
                      icon={KeyIcon}
                      title="Aucun compte pour cet étudiant."
                      description="Assignez son premier compte avec le formulaire ci-dessous."
                    />
                  </div>
                ) : (
                  accountGroups.map(({ label, items }) => (
                    <div key={label}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {label}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((account) => (
                          <AccountRow
                            key={account.id}
                            account={account}
                            labelChoices={labelChoices}
                            delegationChoices={delegationChoices}
                            onSave={(values) => handleUpdate(account, values)}
                            onDelete={() => handleDelete(account)}
                            onToast={showToast}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <AccountForm
                  onSubmit={handleAssign}
                  labelChoices={labelChoices}
                  delegationChoices={delegationChoices}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
