import { useEffect, useMemo, useState } from 'react';
import Badge from '../Badge.jsx';
import Pagination from '../Pagination.jsx';
import { formatMoney } from '../../lib/format.js';
import { computeMoezAmount } from '../../lib/airtable.js';
import {
  CURRENCIES,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLORS,
} from '../../lib/config.js';
import { usePagination } from '../../hooks/usePagination.js';
import { SkeletonRows } from '../states.jsx';

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

function purposeCell(p) {
  if (!p.purpose || p.purpose.length === 0) {
    return <span className="text-xs text-text-muted">—</span>;
  }
  return (
    <div className="flex max-w-[14rem] flex-wrap gap-1">
      {p.purpose.map((label) => (
        <Badge key={label} label={label} bg="#F1EFE8" text="#5F5E5A" />
      ))}
    </div>
  );
}

function moezCell(p) {
  if (!p.moezType || p.moezType === 'Aucune') {
    return <span className="text-xs text-text-muted">Non applicable</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-medium tabular-nums text-text-strong">
        {formatMoney(computeMoezAmount(p), p.currency)}
      </span>
      <Badge label={p.moezType} bg="#F1EFE8" text="#5F5E5A" />
      {!p.soldeConfirme && (
        <span className="text-xs font-medium text-text-muted">⏸ Suspendue</span>
      )}
    </span>
  );
}

const SORT_OPTIONS = [
  { key: 'none', label: 'Ordre par défaut' },
  { key: 'fullName', label: 'Étudiant', get: (p) => (p.fullName || '').toLowerCase() },
  { key: 'amount', label: 'Montant', get: (p) => p.amount || 0 },
  { key: 'netARecevoir', label: 'Net à recevoir', get: (p) => p.netARecevoir || 0 },
  { key: 'dueDate', label: "Date d'échéance", get: (p) => p.dueDate || '' },
  { key: 'paymentDate', label: 'Date de paiement', get: (p) => p.paymentDate || '' },
  { key: 'status', label: 'Statut', get: (p) => p.status || '' },
];

function sortRows(rows, sortKey, sortDir) {
  const option = SORT_OPTIONS.find((o) => o.key === sortKey);
  if (!option || !option.get) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = option.get(a);
    const vb = option.get(b);
    // Empty values (e.g. no due date) always sort last, regardless of direction.
    if (va === '' && vb === '') return 0;
    if (va === '') return 1;
    if (vb === '') return -1;
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function sumByCurrency(rows, pick) {
  const totals = {};
  for (const r of rows) {
    totals[r.currency] = (totals[r.currency] || 0) + pick(r);
  }
  return totals;
}

function TotalsCell({ rows, pick }) {
  const totals = sumByCurrency(rows, pick);
  const entries = Object.entries(totals);
  if (entries.length === 0) return <span>—</span>;
  return (
    <span className="space-x-1.5">
      {entries.map(([cur, val]) => (
        <span key={cur} className="tabular-nums">
          {formatMoney(val, cur)}
        </span>
      ))}
    </span>
  );
}

export default function PaiementsTable({
  paiements,
  loading,
  onEdit,
  onDuplicate,
  onToggleConfirmed,
}) {
  const [status, setStatus] = useState('All');
  const [currency, setCurrency] = useState('All');
  const [confirmedOnly, setConfirmedOnly] = useState('All');
  const [moezOnly, setMoezOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortKey, setSortKey] = useState('none');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return paiements.filter((p) => {
      if (status !== 'All' && p.status !== status) return false;
      if (currency !== 'All' && p.currency !== currency) return false;
      if (confirmedOnly === 'Confirmé' && !p.soldeConfirme) return false;
      if (confirmedOnly === 'Non confirmé' && p.soldeConfirme) return false;
      if (moezOnly && (!p.moezType || p.moezType === 'Aucune')) return false;
      if (
        q &&
        !p.fullName.toLowerCase().includes(q) &&
        !p.reference.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [paiements, status, currency, confirmedOnly, moezOnly, debouncedQuery]);

  const sorted = useMemo(
    () => sortRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const resetKey = useMemo(
    () =>
      `${status}|${currency}|${confirmedOnly}|${moezOnly}|${debouncedQuery}|${sortKey}|${sortDir}|${sorted.length}:${sorted[0]?.id ?? ''}`,
    [status, currency, confirmedOnly, moezOnly, debouncedQuery, sortKey, sortDir, sorted]
  );
  const pagination = usePagination(sorted, { resetKey });
  const visible = loading ? [] : pagination.pageItems;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill label="Tous statuts" active={status === 'All'} onClick={() => setStatus('All')} />
        {PAYMENT_STATUSES.map((s) => (
          <FilterPill key={s} label={s} active={status === s} onClick={() => setStatus(s)} />
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <FilterPill label="Toutes devises" active={currency === 'All'} onClick={() => setCurrency('All')} />
        {CURRENCIES.map((c) => (
          <FilterPill key={c} label={c} active={currency === c} onClick={() => setCurrency(c)} />
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <FilterPill
          label="Solde confirmé"
          active={confirmedOnly === 'Confirmé'}
          onClick={() => setConfirmedOnly(confirmedOnly === 'Confirmé' ? 'All' : 'Confirmé')}
        />
        <FilterPill
          label="Non confirmé"
          active={confirmedOnly === 'Non confirmé'}
          onClick={() => setConfirmedOnly(confirmedOnly === 'Non confirmé' ? 'All' : 'Non confirmé')}
        />
        <span className="mx-1 h-4 w-px bg-border" />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-strong transition hover:border-border-strong">
          <input
            type="checkbox"
            checked={moezOnly}
            onChange={(e) => setMoezOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong accent-current"
          />
          Commission Moez
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par étudiant ou référence…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-sm text-text-muted" htmlFor="paiements-sort">
            Trier par
          </label>
          <select
            id="paiements-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition focus:border-border-strong"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {sortKey !== 'none' && (
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Croissant' : 'Décroissant'}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong transition hover:border-border-strong"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Réf</th>
                <th className="px-4 py-2.5 font-medium">Étudiant</th>
                <th className="px-4 py-2.5 font-medium">Purpose</th>
                <th className="px-4 py-2.5 font-medium">Montant</th>
                <th className="px-4 py-2.5 font-medium">Taxe %</th>
                <th className="px-4 py-2.5 font-medium">Comm. Commercial</th>
                <th className="px-4 py-2.5 font-medium">Comm. Moez</th>
                <th className="px-4 py-2.5 font-medium">Net</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium">Confirmé</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={8} cols={11} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-text-muted">
                    Aucun paiement trouvé
                  </td>
                </tr>
              ) : (
                visible.map((p) => {
                  const color = PAYMENT_STATUS_COLORS[p.status] || {
                    bg: '#F1EFE8',
                    text: '#5F5E5A',
                  };
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 text-xs font-medium text-text-muted">
                        {p.reference || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-strong">{p.fullName || '—'}</p>
                        {p.prospectId && (
                          <p className="text-xs text-text-muted">{p.prospectId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{purposeCell(p)}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{p.taxe || 0}%</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatMoney(p.commCommercial, p.currency)}
                      </td>
                      <td className="px-4 py-3">{moezCell(p)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {formatMoney(p.netARecevoir, p.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={p.status || '—'} bg={color.bg} text={color.text} />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={p.soldeConfirme}
                          onChange={(e) => onToggleConfirmed(p, e.target.checked)}
                          className="h-4 w-4 rounded border-border-strong accent-current"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(p)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-strong transition hover:border-border-strong"
                          >
                            Éditer
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicate(p)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-strong transition hover:border-border-strong"
                          >
                            Dupliquer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-canvas font-semibold">
                  <td className="px-4 py-2.5" colSpan={2}>
                    Totaux ({filtered.length})
                  </td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5">
                    <TotalsCell rows={filtered} pick={(r) => r.amount} />
                  </td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5">
                    <TotalsCell rows={filtered} pick={(r) => r.commCommercial} />
                  </td>
                  <td className="px-4 py-2.5">
                    <TotalsCell
                      rows={filtered.filter((r) => r.soldeConfirme)}
                      pick={(r) => r.commissionMoez}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <TotalsCell rows={filtered} pick={(r) => r.netARecevoir} />
                  </td>
                  <td className="px-4 py-2.5" colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && sorted.length > 0 && (
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </div>
    </div>
  );
}
