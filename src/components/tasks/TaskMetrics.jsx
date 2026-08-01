import { useMemo } from 'react';
import {
  ASSIGNEES,
  STATUS_COLORS,
  TASK_STATUSES,
} from '../../lib/config.js';

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isOverdue(task, today) {
  if (!task.ddl) return false;
  if (task.status === 'Done') return false;
  return task.ddl < today;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-text-strong sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

export default function TaskMetrics({ tasks }) {
  const today = todayISO();

  const stats = useMemo(() => {
    let completed = 0;
    let overdue = 0;
    let inProgress = 0;
    const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));

    for (const t of tasks) {
      if (TASK_STATUSES.includes(t.status)) byStatus[t.status] += 1;
      if (t.status === 'Done') completed += 1;
      if (t.status === 'In progress') inProgress += 1;
      if (isOverdue(t, today)) overdue += 1;
    }

    return {
      total: tasks.length,
      completed,
      overdue,
      inProgress,
      byStatus,
    };
  }, [tasks, today]);

  const workload = useMemo(() => {
    return ASSIGNEES.map((name) => {
      const row = {
        name,
        Todo: 0,
        'In progress': 0,
        Done: 0,
        Total: 0,
      };
      for (const t of tasks) {
        if (t.assignedTo !== name) continue;
        row.Total += 1;
        if (row[t.status] != null) row[t.status] += 1;
      }
      return row;
    });
  }, [tasks]);

  const overdueList = useMemo(
    () =>
      tasks
        .filter((t) => isOverdue(t, today))
        .sort((a, b) => (a.ddl < b.ddl ? -1 : 1)),
    [tasks, today]
  );

  const total = stats.total || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Total tasks" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Overdue" value={stats.overdue} />
        <StatCard label="In Progress" value={stats.inProgress} />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-text-strong">Status breakdown</h3>
        <div className="mt-4 space-y-3">
          {TASK_STATUSES.map((status) => {
            const count = stats.byStatus[status];
            const pct = Math.round((count / total) * 100);
            const color = STATUS_COLORS[status];
            return (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-text-strong">{status}</span>
                  <span className="tabular-nums text-text-muted">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color.text,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text-strong">Workload</h3>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Collaborator</th>
                <th className="px-4 py-2.5 font-medium">Todo</th>
                <th className="px-4 py-2.5 font-medium">In progress</th>
                <th className="px-4 py-2.5 font-medium">Done</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((row) => (
                <tr key={row.name} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium text-text-strong">
                    {row.name}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{row.Todo}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {row['In progress']}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{row.Done}</td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums">
                    {row.Total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-text-strong">Overdue tasks</h3>
        {overdueList.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Aucune tâche en retard</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {overdueList.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-strong">{t.name}</p>
                  <p className="text-xs text-text-muted">
                    {t.assignedTo || '—'} · {t.ticketId || '—'}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-red-600">
                  {t.ddl}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
