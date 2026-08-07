import { priorityLabel, statusLabel, typeLabel } from '../../lib/taskLabels.js';
import { XIcon } from '../icons.jsx';

const DUE_LABELS = {
  overdue: 'En retard',
  today: "Aujourd'hui",
  week: 'Cette semaine',
  noDeadline: 'Sans échéance',
};

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer le filtre ${label}`}
        className="rounded-full p-0.5 hover:bg-brand/15"
      >
        <XIcon size={11} />
      </button>
    </span>
  );
}

export default function ActiveFilterChips({ filters, onChange }) {
  const chips = [];
  if (filters.query.trim()) {
    chips.push({
      key: 'query',
      label: `« ${filters.query.trim()} »`,
      clear: () => onChange({ ...filters, query: '' }),
    });
  }
  if (filters.assignee !== 'All') {
    chips.push({
      key: 'assignee',
      label: filters.assignee,
      clear: () => onChange({ ...filters, assignee: 'All' }),
    });
  }
  if (filters.priority !== 'All') {
    chips.push({
      key: 'priority',
      label: priorityLabel(filters.priority),
      clear: () => onChange({ ...filters, priority: 'All' }),
    });
  }
  if (filters.type !== 'All') {
    chips.push({
      key: 'type',
      label: typeLabel(filters.type),
      clear: () => onChange({ ...filters, type: 'All' }),
    });
  }
  if (filters.status !== 'All') {
    chips.push({
      key: 'status',
      label: statusLabel(filters.status),
      clear: () => onChange({ ...filters, status: 'All' }),
    });
  }
  if (filters.due !== 'all') {
    chips.push({
      key: 'due',
      label: DUE_LABELS[filters.due],
      clear: () => onChange({ ...filters, due: 'all' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Chip key={c.key} label={c.label} onRemove={c.clear} />
      ))}
    </div>
  );
}
