import { useMemo } from 'react';
import { computeWorkload } from '../../lib/taskStats.js';

export default function WorkloadWidget({ tasks }) {
  const workload = useMemo(() => computeWorkload(tasks), [tasks]);
  const active = workload.map((w) => ({
    name: w.name,
    count: w.Todo + w['In progress'] + w.Blocked,
  }));
  const max = Math.max(1, ...active.map((w) => w.count));

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-strong">Charge de travail</h3>
      <ul className="mt-3 space-y-3">
        {active.map((w) => (
          <li key={w.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text-strong">{w.name}</span>
              <span className="tabular-nums text-text-muted">
                {w.count} tâche{w.count > 1 ? 's' : ''} active{w.count > 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${(w.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
