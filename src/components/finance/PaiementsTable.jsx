import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../Badge.jsx';
import Pagination from '../Pagination.jsx';
import { formatMoney } from '../../lib/format.js';
import { computeMoezAmount } from '../../lib/airtable.js';
import { CURRENCIES, PAYMENT_STATUSES } from '../../lib/config.js';
import { usePagination } from '../../hooks/usePagination.js';
import { SkeletonRows } from '../states.jsx';
import {
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  PencilIcon,
  ReceiptIcon,
  TrashIcon,
  XIcon,
} from '../icons.jsx';

// Compact row action: icon-only button (or link) with a hover/focus tooltip.
function ActionIcon({ label, to, onClick, danger = false, children }) {
  const className = `group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
    danger
      ? 'border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50'
      : 'border-border text-text-muted hover:border-border-strong hover:text-text-strong'
  }`;
  const tooltip = (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
  return to ? (
    <Link to={to} aria-label={label} className={className}>
      {children}
      {tooltip}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {children}
      {tooltip}
    </button>
  );
}

function MultiSelectFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const summary =
    selected.length === 0
      ? 'Tous'
      : selected.length === 1
        ? selected[0]
        : `${selected.length} sélectionnés`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex min-w-[12rem] max-w-[18rem] items-center justify-between gap-2 rounded-xl border bg-surface px-3 py-2.5 text-sm transition ${
          selected.length > 0
            ? 'border-brand text-text-strong'
            : 'border-border text-text-strong hover:border-border-strong'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-text-muted">{label}</span>
          <span className="truncate font-medium">{summary}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Effacer"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="rounded p-0.5 text-text-muted hover:bg-canvas hover:text-text-strong"
            >
              <XIcon size={12} />
            </span>
          )}
          <ChevronDownIcon size={14} className="text-text-muted" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-text-muted hover:text-text-strong"
            >
              Tout effacer
            </button>
            <button
              type="button"
              onClick={() => onChange([...options])}
              className="text-xs font-medium text-text-muted hover:text-text-strong"
            >
              Tout sélectionner
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto scroll-thin py-1">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-text-muted">Aucune option</li>
            ) : (
              options.map((opt) => (
                <li key={opt}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-text-strong hover:bg-canvas">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={() => toggle(opt)}
                      className="h-4 w-4 rounded border-border-strong accent-current"
                    />
                    <span className="min-w-0 break-words">{opt}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
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
  purposeChoices = [],
  statusChoices = PAYMENT_STATUSES,
  currencyChoices = CURRENCIES,
  statusColors = {},
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirmed,
}) {
  const [statusFilter, setStatusFilter] = useState([]);
  const [currencyFilter, setCurrencyFilter] = useState([]);
  const [purposeFilter, setPurposeFilter] = useState([]);
  const [moezOnly, setMoezOnly] = useState(false);
  // The Comm. Moez column only shows while the "Commission Moez" filter is on.
  const columnCount = moezOnly ? 10 : 9;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortKey, setSortKey] = useState('none');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Schema choices + any purpose values present in data but not yet in schema.
  const purposeOptions = useMemo(() => {
    const seen = new Set(purposeChoices);
    const extras = [];
    for (const p of paiements) {
      for (const label of p.purpose || []) {
        if (label && !seen.has(label)) {
          seen.add(label);
          extras.push(label);
        }
      }
    }
    return [...purposeChoices, ...extras];
  }, [purposeChoices, paiements]);

  // Drop selections that no longer exist after an Airtable refresh.
  useEffect(() => {
    setPurposeFilter((prev) =>
      prev.filter((p) => purposeOptions.includes(p))
    );
  }, [purposeOptions]);
  useEffect(() => {
    setStatusFilter((prev) => prev.filter((s) => statusChoices.includes(s)));
  }, [statusChoices]);
  useEffect(() => {
    setCurrencyFilter((prev) => prev.filter((c) => currencyChoices.includes(c)));
  }, [currencyChoices]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return paiements.filter((p) => {
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (currencyFilter.length > 0 && !currencyFilter.includes(p.currency)) return false;
      if (moezOnly && (!p.moezType || p.moezType === 'Aucune')) return false;
      if (
        purposeFilter.length > 0 &&
        !purposeFilter.some((label) => (p.purpose || []).includes(label))
      ) {
        return false;
      }
      if (
        q &&
        !p.fullName.toLowerCase().includes(q) &&
        !p.reference.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    paiements,
    statusFilter,
    currencyFilter,
    moezOnly,
    purposeFilter,
    debouncedQuery,
  ]);

  const sorted = useMemo(
    () => sortRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const resetKey = useMemo(
    () =>
      `${statusFilter.join(',')}|${currencyFilter.join(',')}|${purposeFilter.join(',')}|${moezOnly}|${debouncedQuery}|${sortKey}|${sortDir}|${sorted.length}:${sorted[0]?.id ?? ''}`,
    [
      statusFilter,
      currencyFilter,
      purposeFilter,
      moezOnly,
      debouncedQuery,
      sortKey,
      sortDir,
      sorted,
    ]
  );
  const pagination = usePagination(sorted, { resetKey });
  const visible = loading ? [] : pagination.pageItems;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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

        <MultiSelectFilter
          label="Statut"
          options={statusChoices}
          selected={statusFilter}
          onChange={setStatusFilter}
        />

        <MultiSelectFilter
          label="Devise"
          options={currencyChoices}
          selected={currencyFilter}
          onChange={setCurrencyFilter}
        />

        <MultiSelectFilter
          label="Purpose"
          options={purposeOptions}
          selected={purposeFilter}
          onChange={setPurposeFilter}
        />

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
                {moezOnly && <th className="px-4 py-2.5 font-medium">Comm. Moez</th>}
                <th className="px-4 py-2.5 font-medium">Net</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium">Confirmé</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={8} cols={columnCount} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-text-muted">
                    Aucun paiement trouvé
                  </td>
                </tr>
              ) : (
                visible.map((p) => {
                  const color = statusColors[p.status] || {
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
                      {moezOnly && <td className="px-4 py-3">{moezCell(p)}</td>}
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
                        <div className="flex gap-1">
                          <ActionIcon
                            label="Facture"
                            to={`/finance/paiements/${p.id}/document?type=invoice`}
                          >
                            <FileTextIcon size={15} />
                          </ActionIcon>
                          <ActionIcon
                            label="Reçu"
                            to={`/finance/paiements/${p.id}/document?type=receipt`}
                          >
                            <ReceiptIcon size={15} />
                          </ActionIcon>
                          <ActionIcon label="Éditer" onClick={() => onEdit(p)}>
                            <PencilIcon size={15} />
                          </ActionIcon>
                          <ActionIcon label="Dupliquer" onClick={() => onDuplicate(p)}>
                            <CopyIcon size={15} />
                          </ActionIcon>
                          <ActionIcon label="Supprimer" danger onClick={() => onDelete(p)}>
                            <TrashIcon size={15} />
                          </ActionIcon>
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
                  {moezOnly && (
                    <td className="px-4 py-2.5">
                      <TotalsCell
                        rows={filtered.filter((r) => r.soldeConfirme)}
                        pick={(r) => r.commissionMoez}
                      />
                    </td>
                  )}
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
