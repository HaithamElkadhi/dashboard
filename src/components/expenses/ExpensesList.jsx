import { useMemo, useState } from 'react';
import Badge from '../Badge.jsx';
import { SkeletonRows } from '../states.jsx';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_COLORS,
  EXPENSE_CATEGORY_COLORS,
} from '../../lib/config.js';
import { formatMoney } from '../../lib/format.js';
import { PencilIcon, RefreshIcon, TrashIcon, ExternalLinkIcon } from '../icons.jsx';

const SORTS = [
  { id: 'date-desc', label: 'Date ↓' },
  { id: 'date-asc', label: 'Date ↑' },
  { id: 'amount-desc', label: 'Amount ↓' },
  { id: 'amount-asc', label: 'Amount ↑' },
];

const pillClass = (active) =>
  `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
    active
      ? 'bg-brand text-white'
      : 'border border-border bg-surface text-text-muted hover:border-border-strong hover:text-text-strong'
  }`;

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ExpensesList({
  expenses,
  loading,
  onEdit,
  onDelete,
  onRefresh,
  refreshing,
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [sort, setSort] = useState('date-desc');

  const filtered = useMemo(() => {
    let rows = [...expenses];
    if (statusFilter !== 'All') {
      rows = rows.filter((e) => e.status === statusFilter);
    }
    if (categoryFilter !== 'All') {
      rows = rows.filter((e) => e.categories?.includes(categoryFilter));
    }
    if (currencyFilter !== 'All') {
      rows = rows.filter((e) => e.currency === currencyFilter);
    }

    rows.sort((a, b) => {
      if (sort === 'date-desc') return (a.date || '') < (b.date || '') ? 1 : -1;
      if (sort === 'date-asc') return (a.date || '') > (b.date || '') ? 1 : -1;
      if (sort === 'amount-desc') return (b.amount || 0) - (a.amount || 0);
      if (sort === 'amount-asc') return (a.amount || 0) - (b.amount || 0);
      return 0;
    });
    return rows;
  }, [expenses, statusFilter, categoryFilter, currencyFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text-strong">{filtered.length}</span>{' '}
          result{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-strong outline-none focus:border-border-strong"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
          >
            <RefreshIcon size={12} />
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <FilterRow label="Status">
          {['All', ...EXPENSE_STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={pillClass(statusFilter === s)}
            >
              {s}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="Category">
          {['All', ...EXPENSE_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={pillClass(categoryFilter === c)}
            >
              {c}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="Currency">
          {['All', ...EXPENSE_CURRENCIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrencyFilter(c)}
              className={pillClass(currencyFilter === c)}
            >
              {c}
            </button>
          ))}
        </FilterRow>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Paid by</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={6} cols={9} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    No expenses match these filters
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const statusColor = EXPENSE_STATUS_COLORS[e.status] || {
                    bg: '#F1EFE8',
                    text: '#5F5E5A',
                  };
                  const invoices = e.invoices || [];
                  return (
                    <tr key={e.id} className="border-t border-border">
                      <td className="max-w-[14rem] px-4 py-3 font-medium text-text-strong">
                        <span className="line-clamp-2">{e.description || '—'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                        {formatDate(e.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-text-strong">
                        {formatMoney(e.amount, e.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(e.categories || []).length === 0 ? (
                            <span className="text-text-muted">—</span>
                          ) : (
                            e.categories.map((c) => {
                              const color = EXPENSE_CATEGORY_COLORS[c] || {
                                bg: '#F1EFE8',
                                text: '#5F5E5A',
                              };
                              return (
                                <Badge
                                  key={c}
                                  label={c}
                                  bg={color.bg}
                                  text={color.text}
                                />
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-text-muted">
                        {e.paymentMethod || '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {e.paidBy || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={e.status || '—'}
                          bg={statusColor.bg}
                          text={statusColor.text}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {invoices.length === 0 ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {invoices.map((att) => (
                              <a
                                key={att.id || att.url}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-[10rem] items-center gap-1 truncate text-xs font-medium text-brand hover:underline"
                                title={att.filename}
                              >
                                <ExternalLinkIcon size={12} />
                                <span className="truncate">
                                  {att.filename || 'File'}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(e)}
                            className="rounded-lg p-1.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
                            aria-label="Edit"
                            title="Edit"
                          >
                            <PencilIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(e)}
                            className="rounded-lg p-1.5 text-text-muted transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
                            title="Delete"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
