import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../Badge.jsx';
import Pagination from '../Pagination.jsx';
import { formatDateTime } from '../../lib/format.js';
import { bookingStatusColor } from '../../lib/config.js';
import { usePagination } from '../../hooks/usePagination.js';
import { SkeletonRows } from '../states.jsx';
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
} from '../icons.jsx';
import BookingEmailButton from './BookingEmailButton.jsx';

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  colorFor,
  allLabel = 'Tous',
}) {
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
      ? allLabel
      : selected.length === 1
        ? selected[0]
        : `${selected.length} sélectionnés`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex min-w-[10rem] items-center justify-between gap-2 rounded-xl border bg-surface px-3 py-2.5 text-sm transition ${
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
        <div className="absolute left-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
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
            {options.map((opt) => {
              const checked = selected.includes(opt);
              const color = colorFor?.(opt);
              return (
                <li key={opt}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-text-strong hover:bg-canvas">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                      className="h-4 w-4 rounded border-border-strong accent-current"
                    />
                    {color ? (
                      <Badge label={opt} bg={color.bg} text={color.text} />
                    ) : (
                      <span>{opt}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  {
    key: 'dateTime',
    label: 'Date & heure',
    get: (b) => b.dateTime || '',
  },
  {
    key: 'studentName',
    label: 'Étudiant',
    get: (b) => (b.studentName || '').toLowerCase(),
  },
  {
    key: 'email',
    label: 'Email',
    get: (b) => (b.email || '').toLowerCase(),
  },
  {
    key: 'meetingType',
    label: 'Type',
    get: (b) => (b.meetingType || '').toLowerCase(),
  },
  {
    key: 'bookingStatus',
    label: 'Statut',
    get: (b) => (b.bookingStatus || '').toLowerCase(),
  },
];

function sortRows(rows, sortKey, sortDir) {
  const option = SORT_OPTIONS.find((o) => o.key === sortKey);
  if (!option?.get) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = option.get(a);
    const vb = option.get(b);
    if (va === '' && vb === '') return 0;
    if (va === '') return 1;
    if (vb === '') return -1;
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function startOfDayMs(date) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function matchesWhenFilter(iso, when) {
  if (when === 'all') return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;

  const day = startOfDayMs(d);
  const today = startOfDayMs(new Date());
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (when === 'today') return day === today;
  if (when === 'tomorrow') return day === tomorrow;
  // After tomorrow (from day after tomorrow onward)
  if (when === 'upcoming') return day > tomorrow;
  if (when === 'passed') return d.getTime() < now;
  return true;
}

const WHEN_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'passed', label: 'Passed' },
];

export default function BookingsTable({
  bookings,
  loading,
  statuses,
  meetingTypes,
  onOpen,
  onEdit,
  onCancel,
  onDelete,
  onEmail,
}) {
  const [statusFilter, setStatusFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState([]);
  const [whenFilter, setWhenFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortKey, setSortKey] = useState('dateTime');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (
        statusFilter.length > 0 &&
        !statusFilter.includes(b.bookingStatus)
      ) {
        return false;
      }
      if (typeFilter.length > 0 && !typeFilter.includes(b.meetingType)) {
        return false;
      }
      if (!matchesWhenFilter(b.dateTime, whenFilter)) return false;
      if (
        q &&
        !(b.studentName || '').toLowerCase().includes(q) &&
        !(b.email || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [bookings, statusFilter, typeFilter, whenFilter, debouncedQuery]);

  const sorted = useMemo(
    () => sortRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const resetKey = useMemo(
    () =>
      `${statusFilter.join(',')}|${typeFilter.join(',')}|${whenFilter}|${debouncedQuery}|${sortKey}|${sortDir}|${sorted.length}:${sorted[0]?.id ?? ''}`,
    [
      statusFilter,
      typeFilter,
      whenFilter,
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
        <div className="relative max-w-sm min-w-[14rem] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <SearchIcon size={14} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
          />
        </div>

        <MultiSelectDropdown
          label="Statut"
          options={statuses}
          selected={statusFilter}
          onChange={setStatusFilter}
          colorFor={bookingStatusColor}
          allLabel="Tous"
        />

        <MultiSelectDropdown
          label="Type"
          options={meetingTypes}
          selected={typeFilter}
          onChange={setTypeFilter}
          allLabel="Tous"
        />

        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          {WHEN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setWhenFilter(opt.id)}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                whenFilter === opt.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-strong'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-sm text-text-muted" htmlFor="bookings-sort">
            Trier par
          </label>
          <select
            id="bookings-sort"
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
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Croissant' : 'Décroissant'}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong transition hover:border-border-strong"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Étudiant</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
                <th className="px-4 py-2.5 font-medium">Date & heure</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium">Lien</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={8} cols={7} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    Aucun booking trouvé
                  </td>
                </tr>
              ) : (
                visible.map((b) => {
                  const color = bookingStatusColor(b.bookingStatus);
                  return (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-t border-border transition hover:bg-canvas/60"
                      onClick={() => onOpen(b)}
                    >
                      <td className="px-4 py-3 font-medium text-text-strong">
                        {b.studentName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-text-strong">{b.email || '—'}</p>
                        {b.phone ? (
                          <p className="text-xs text-text-muted">{b.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-strong">
                        {formatDateTime(b.dateTime)}
                      </td>
                      <td className="px-4 py-3">{b.meetingType || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          label={b.bookingStatus || '—'}
                          bg={color.bg}
                          text={color.text}
                        />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {b.meetingLink ? (
                          <a
                            href={b.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-lg border border-border p-1.5 text-text-strong transition hover:border-border-strong"
                            title="Ouvrir le lien"
                          >
                            <ExternalLinkIcon size={14} />
                          </a>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1.5">
                          <BookingEmailButton
                            booking={b}
                            onChoose={(kind) => onEmail?.(b, kind)}
                          />
                          <button
                            type="button"
                            onClick={() => onEdit(b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-strong transition hover:border-border-strong"
                            title="Éditer"
                          >
                            <PencilIcon size={12} />
                            Éditer
                          </button>
                          {b.bookingStatus !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => onCancel(b)}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:border-amber-300"
                            >
                              Annuler
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDelete(b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-red-700 transition hover:border-red-300"
                            title="Supprimer"
                          >
                            <TrashIcon size={12} />
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
