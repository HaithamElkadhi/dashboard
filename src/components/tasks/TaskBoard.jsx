import { useEffect, useMemo, useState } from 'react';
import Badge from '../Badge.jsx';
import {
  ASSIGNEES,
  PRIORITY_COLORS,
  STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../lib/config.js';

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

function TaskCard({ task, onEdit, onDelete }) {
  const priority = PRIORITY_COLORS[task.priority] || {
    bg: '#F1EFE8',
    text: '#5F5E5A',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onEdit(task);
      }}
      className="group cursor-pointer rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-text-muted">
          {task.ticketId || '—'}
        </span>
        <button
          type="button"
          title="Supprimer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          className="rounded p-0.5 text-text-muted opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          🗑
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-text-strong line-clamp-2">
        {task.name}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {task.priority && (
          <Badge label={task.priority} bg={priority.bg} text={priority.text} />
        )}
        {task.type && (
          <Badge label={task.type} bg="#F1EFE8" text="#5F5E5A" />
        )}
      </div>
      {task.prospectName && (
        <p className="mt-2 truncate text-xs text-text-muted">
          {task.prospectName}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-muted">
        <span>{task.assignedTo || '—'}</span>
        <span className="tabular-nums">{task.ddl || ''}</span>
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks, onEdit, onDelete }) {
  const [assignee, setAssignee] = useState('All');
  const [priority, setPriority] = useState('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (assignee !== 'All' && task.assignedTo !== assignee) return false;
      if (priority !== 'All' && task.priority !== priority) return false;
      if (q && !task.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, assignee, priority, debouncedQuery]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(TASK_STATUSES.map((s) => [s, []]));
    for (const task of filtered) {
      const key = TASK_STATUSES.includes(task.status) ? task.status : 'Todo';
      map[key].push(task);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label="All"
          active={assignee === 'All'}
          onClick={() => setAssignee('All')}
        />
        {ASSIGNEES.map((a) => (
          <FilterPill
            key={a}
            label={a}
            active={assignee === a}
            onClick={() => setAssignee(a)}
          />
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <FilterPill
          label="All priorities"
          active={priority === 'All'}
          onClick={() => setPriority('All')}
        />
        {TASK_PRIORITIES.map((p) => (
          <FilterPill
            key={p}
            label={p}
            active={priority === p}
            onClick={() => setPriority(p)}
          />
        ))}
      </div>

      <div className="relative max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par titre…"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scroll-thin">
        {TASK_STATUSES.map((status) => {
          const color = STATUS_COLORS[status];
          const column = byStatus[status];
          return (
            <div
              key={status}
              className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-canvas/60"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {status}
                </span>
                <span className="text-xs tabular-nums text-text-muted">
                  {column.length}
                </span>
              </div>
              <div className="flex max-h-[calc(100vh-20rem)] flex-col gap-2 overflow-y-auto p-2 scroll-thin">
                {column.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-text-muted">
                    Aucune tâche
                  </p>
                ) : (
                  column.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
