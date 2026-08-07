import { useEffect, useRef, useState } from 'react';
import {
  ASSIGNEES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from '../../lib/config.js';
import { priorityLabel, statusLabel, typeLabel } from '../../lib/taskLabels.js';
import { ArrowUpDownIcon, ChevronDownIcon, SearchIcon } from '../icons.jsx';

const DUE_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'overdue', label: 'En retard' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'noDeadline', label: 'Sans échéance' },
];

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Échéance' },
  { value: 'priority', label: 'Priorité' },
  { value: 'name', label: 'Nom' },
];

function FilterPopover({ label, active, activeLabel, options, value, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
          active
            ? 'border-brand/40 bg-brand/5 text-brand'
            : 'border-border bg-surface text-text-strong hover:border-border-strong'
        }`}
      >
        {active ? activeLabel : label}
        <ChevronDownIcon size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                value === opt.value
                  ? 'bg-brand/10 font-medium text-brand'
                  : 'text-text-strong hover:bg-canvas'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskFilters({ filters, onChange, onReset, hasActiveFilters }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[11rem] flex-1 sm:max-w-xs">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          <SearchIcon size={14} />
        </span>
        <input
          type="text"
          value={filters.query}
          onChange={(e) => set('query')(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher une tâche"
          className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
        />
      </div>

      <FilterPopover
        label="Responsable"
        active={filters.assignee !== 'All'}
        activeLabel={filters.assignee}
        value={filters.assignee}
        onSelect={set('assignee')}
        options={[{ value: 'All', label: 'Tous' }, ...ASSIGNEES.map((a) => ({ value: a, label: a }))]}
      />

      <FilterPopover
        label="Priorité"
        active={filters.priority !== 'All'}
        activeLabel={priorityLabel(filters.priority)}
        value={filters.priority}
        onSelect={set('priority')}
        options={[
          { value: 'All', label: 'Toutes' },
          ...TASK_PRIORITIES.map((p) => ({ value: p, label: priorityLabel(p) })),
        ]}
      />

      <FilterPopover
        label="Type"
        active={filters.type !== 'All'}
        activeLabel={typeLabel(filters.type)}
        value={filters.type}
        onSelect={set('type')}
        options={[
          { value: 'All', label: 'Tous' },
          ...TASK_TYPES.map((t) => ({ value: t, label: typeLabel(t) })),
        ]}
      />

      <FilterPopover
        label="Statut"
        active={filters.status !== 'All'}
        activeLabel={statusLabel(filters.status)}
        value={filters.status}
        onSelect={set('status')}
        options={[
          { value: 'All', label: 'Tous' },
          ...TASK_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
        ]}
      />

      <FilterPopover
        label="Échéance"
        active={filters.due !== 'all'}
        activeLabel={DUE_OPTIONS.find((o) => o.value === filters.due)?.label}
        value={filters.due}
        onSelect={set('due')}
        options={DUE_OPTIONS}
      />

      <div className="relative">
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy')(e.target.value)}
          aria-label="Trier par"
          className="appearance-none rounded-lg border border-border bg-surface py-1.5 pl-7 pr-7 text-sm font-medium text-text-strong outline-none transition hover:border-border-strong"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Trier · {o.label}
            </option>
          ))}
        </select>
        <ArrowUpDownIcon
          size={13}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-text-muted underline-offset-2 hover:text-text-strong hover:underline"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
