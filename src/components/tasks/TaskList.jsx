import { useMemo } from 'react';
import { groupTasksByDate } from '../../lib/taskDates.js';
import { usePagination } from '../../hooks/usePagination.js';
import TaskRow from './TaskRow.jsx';
import EmptyState from '../EmptyState.jsx';
import Pagination from '../Pagination.jsx';
import { ListChecksIcon, SearchIcon } from '../icons.jsx';

const GROUP_ORDER = [
  { key: 'overdue', label: 'En retard' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'tomorrow', label: 'Demain' },
  { key: 'thisWeek', label: 'Cette semaine' },
  { key: 'later', label: 'Plus tard' },
  { key: 'noDeadline', label: 'Sans échéance' },
];

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function compareTasks(a, b, sortBy) {
  if (sortBy === 'priority') {
    return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
  }
  if (sortBy === 'name') return a.name.localeCompare(b.name, 'fr');
  return (a.ddl || '9999-99-99').localeCompare(b.ddl || '9999-99-99');
}

function flattenSortedTasks(tasks, sortBy) {
  const groups = groupTasksByDate(tasks);
  const ordered = [];
  for (const { key } of GROUP_ORDER) {
    const items = [...groups[key]].sort((a, b) => compareTasks(a, b, sortBy));
    ordered.push(...items);
  }
  return ordered;
}

export default function TaskList({
  tasks,
  allTasksCount,
  hasActiveFilters,
  sortBy,
  onOpen,
  onToggleDone,
  onDuplicate,
  onArchive,
  onDelete,
  onCreate,
  onResetFilters,
}) {
  const flat = useMemo(() => flattenSortedTasks(tasks, sortBy), [tasks, sortBy]);

  const resetKey = useMemo(
    () =>
      `${sortBy}|${tasks.length}:${tasks[0]?.id ?? ''}:${tasks[tasks.length - 1]?.id ?? ''}`,
    [tasks, sortBy]
  );
  const pagination = usePagination(flat, { resetKey });
  const allGroups = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const pageGroups = useMemo(
    () => groupTasksByDate(pagination.pageItems),
    [pagination.pageItems]
  );

  if (allTasksCount === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={ListChecksIcon}
          title="Aucune tâche pour le moment."
          description="Créez votre première tâche pour commencer à organiser le travail de l’équipe."
          actionLabel="Créer une tâche"
          onAction={onCreate}
        />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={SearchIcon}
          title="Aucune tâche ne correspond à vos filtres."
          actionLabel={hasActiveFilters ? 'Réinitialiser les filtres' : undefined}
          onAction={onResetFilters}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="divide-y divide-border">
        {GROUP_ORDER.map(({ key, label }) => {
          const items = [...pageGroups[key]].sort((a, b) =>
            compareTasks(a, b, sortBy)
          );
          if (items.length === 0) return null;
          const totalInGroup = allGroups[key].length;
          return (
            <div key={key} className="px-1.5 py-2">
              <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {label}{' '}
                <span className="tabular-nums text-text-muted/70">({totalInGroup})</span>
              </p>
              <div className="space-y-0.5">
                {items.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={onOpen}
                    onToggleDone={onToggleDone}
                    onDuplicate={onDuplicate}
                    onArchive={onArchive}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
    </div>
  );
}
