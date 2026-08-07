import { useMemo } from 'react';
import { groupTasksByDate } from '../../lib/taskDates.js';

export default function UpcomingDeadlinesWidget({ tasks }) {
  const groups = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const rows = [
    { label: 'En retard', count: groups.overdue.length, tone: 'text-red-600' },
    { label: "Aujourd'hui", count: groups.today.length, tone: 'text-text-strong' },
    {
      label: 'Cette semaine',
      count: groups.tomorrow.length + groups.thisWeek.length,
      tone: 'text-text-strong',
    },
    { label: 'Sans échéance', count: groups.noDeadline.length, tone: 'text-text-muted' },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-strong">Échéances</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between">
            <span className="text-text-muted">{r.label}</span>
            <span className={`font-semibold tabular-nums ${r.tone}`}>{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
