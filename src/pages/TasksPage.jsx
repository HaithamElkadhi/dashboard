import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTasksWorkspace } from '../contexts/TasksWorkspaceContext.jsx';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { ErrorState } from '../components/states.jsx';
import Pagination from '../components/Pagination.jsx';
import StatsCard from '../components/tasks/StatsCard.jsx';
import TaskFilters from '../components/tasks/TaskFilters.jsx';
import ActiveFilterChips from '../components/tasks/ActiveFilterChips.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import KanbanBoard from '../components/tasks/KanbanBoard.jsx';
import ProgressWidget from '../components/tasks/ProgressWidget.jsx';
import UpcomingDeadlinesWidget from '../components/tasks/UpcomingDeadlinesWidget.jsx';
import WorkloadWidget from '../components/tasks/WorkloadWidget.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { ARCHIVED_STATUS } from '../lib/config.js';
import { addDaysISO, isTaskOverdue, todayISO } from '../lib/taskDates.js';
import { computeTaskStats } from '../lib/taskStats.js';
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockAlertIcon,
  ClockIcon,
  KanbanIcon,
  ListChecksIcon,
  TrashIcon,
} from '../components/icons.jsx';

const ASSIGNEE_FILTER_KEY = 'jeexpert:tasks:assigneeFilter:v1';
const VIEW_MODE_KEY = 'jeexpert:tasks:viewMode';

const DEFAULT_FILTERS = {
  query: '',
  assignee: 'All',
  priority: 'All',
  type: 'All',
  status: 'All',
  due: 'all',
  sortBy: 'deadline',
};

function ArchivedSection({ tasks, onOpen, onRestore, onDelete }) {
  const [open, setOpen] = useState(false);
  const resetKey = useMemo(
    () => `${tasks.length}:${tasks[0]?.id ?? ''}:${tasks[tasks.length - 1]?.id ?? ''}`,
    [tasks]
  );
  const pagination = usePagination(tasks, { pageSize: 10, resetKey });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted underline-offset-2 hover:text-text-strong hover:underline"
      >
        <ArchiveIcon size={14} />
        {open ? 'Masquer' : 'Voir'} les tâches archivées ({tasks.length})
      </button>
      {open &&
        (tasks.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-canvas/40 px-3 py-4 text-center text-sm text-text-muted">
            Aucune tâche archivée.
          </p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-canvas/40">
            <ul className="divide-y divide-border">
              {pagination.pageItems.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <button type="button" onClick={() => onOpen(task)} className="min-w-0 text-left">
                    <p className="truncate font-medium text-text-muted">{task.name}</p>
                    <p className="text-xs text-text-muted">
                      {task.assignedTo || '—'} · {task.ticketId || '—'}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(task)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-strong transition hover:border-border-strong"
                    >
                      Restaurer
                    </button>
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={() => onDelete(task)}
                      className="rounded p-1 text-text-muted transition hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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
        ))}
    </div>
  );
}

export default function TasksPage() {
  const {
    tasks,
    status,
    error,
    lastUpdated,
    refresh,
    create,
    remove,
    quickUpdateStatus,
    openCreate,
    openDetails,
    showToast,
  } = useTasksWorkspace();

  usePageRefreshRegistration({ lastUpdated, refresh, loading: status === 'loading' });

  const [searchParams, setSearchParams] = useSearchParams();
  const viewFromUrl = searchParams.get('view');
  const [view, setView] = useState(() => {
    if (viewFromUrl === 'list' || viewFromUrl === 'kanban') return viewFromUrl;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === 'list' || saved === 'kanban') return saved;
    }
    return 'list';
  });

  useEffect(() => {
    if (viewFromUrl === 'list' || viewFromUrl === 'kanban') setView(viewFromUrl);
  }, [viewFromUrl]);

  const changeView = (next) => {
    setView(next);
    localStorage.setItem(VIEW_MODE_KEY, next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('view', next);
        return p;
      },
      { replace: true }
    );
  };

  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    assignee:
      typeof window !== 'undefined'
        ? localStorage.getItem(ASSIGNEE_FILTER_KEY) || 'All'
        : 'All',
  }));
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(ASSIGNEE_FILTER_KEY, filters.assignee);
  }, [filters.assignee]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(filters.query), 300);
    return () => clearTimeout(t);
  }, [filters.query]);

  // Auto-refresh: keep data current without a manual button — a periodic
  // tick, plus a catch-up refresh when the tab regains focus if it's been
  // a while since the last successful fetch.
  useEffect(() => {
    const interval = setInterval(() => refresh(), 120000);
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (!lastUpdated || Date.now() - lastUpdated.getTime() > 60000) refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, lastUpdated]);

  const today = todayISO();

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== ARCHIVED_STATUS),
    [tasks]
  );
  const archivedTasks = useMemo(
    () => tasks.filter((t) => t.status === ARCHIVED_STATUS),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const weekEnd = addDaysISO(today, 7);
    return activeTasks.filter((t) => {
      if (filters.assignee !== 'All' && t.assignedTo !== filters.assignee) return false;
      if (filters.priority !== 'All' && t.priority !== filters.priority) return false;
      if (filters.type !== 'All' && t.type !== filters.type) return false;
      if (filters.status !== 'All' && t.status !== filters.status) return false;
      if (filters.due === 'overdue' && !isTaskOverdue(t, today)) return false;
      if (filters.due === 'today' && t.ddl !== today) return false;
      if (filters.due === 'noDeadline' && t.ddl) return false;
      if (filters.due === 'week') {
        if (!t.ddl || isTaskOverdue(t, today) || t.ddl < today || t.ddl > weekEnd) return false;
      }
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !t.prospectName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeTasks, filters, debouncedQuery, today]);

  const hasActiveFilters =
    filters.query.trim() !== '' ||
    filters.assignee !== 'All' ||
    filters.priority !== 'All' ||
    filters.type !== 'All' ||
    filters.status !== 'All' ||
    filters.due !== 'all';

  const resetFilters = () => setFilters({ ...DEFAULT_FILTERS, assignee: filters.assignee });

  const stats = useMemo(() => computeTaskStats(tasks, today), [tasks, today]);

  const handleToggleDone = async (task) => {
    try {
      await quickUpdateStatus(task.id, task.status === 'Done' ? 'Todo' : 'Done');
      showToast(task.status === 'Done' ? 'Tâche rouverte' : 'Tâche terminée');
    } catch (err) {
      showToast(err.message || 'Échec de la mise à jour');
    }
  };

  const handleStatusChange = async (task, nextStatus) => {
    if (task.status === nextStatus) return;
    try {
      await quickUpdateStatus(task.id, nextStatus);
      if (nextStatus === 'Done') showToast('Tâche terminée');
    } catch (err) {
      showToast(err.message || 'Échec de la mise à jour du statut');
    }
  };

  const handleDuplicate = async (task) => {
    try {
      const created = await create({
        name: task.name,
        type: task.type,
        priority: task.priority,
        assignedTo: task.assignedTo,
        status: 'Todo',
        ddl: task.ddl,
        notes: task.notes,
        prospectName: task.prospectName,
      });
      showToast(created.ticketId ? `Tâche dupliquée — ${created.ticketId}` : 'Tâche dupliquée');
    } catch (err) {
      showToast(err.message || 'Échec de la duplication');
    }
  };

  const handleArchive = async (task) => {
    try {
      await quickUpdateStatus(task.id, ARCHIVED_STATUS);
      showToast('Tâche archivée');
    } catch (err) {
      showToast(err.message || 'Échec de l’archivage');
    }
  };

  const handleRestore = async (task) => {
    try {
      await quickUpdateStatus(task.id, 'Todo');
      showToast('Tâche restaurée');
    } catch (err) {
      showToast(err.message || 'Échec de la restauration');
    }
  };

  const handleDelete = async (task) => {
    const ok = window.confirm(
      `Supprimer « ${task.name} »${task.ticketId ? ` (${task.ticketId})` : ''} ?`
    );
    if (!ok) return;
    try {
      await remove(task.id);
      showToast('Tâche supprimée');
    } catch (err) {
      showToast(err.message || 'Suppression impossible');
    }
  };

  const showSkeleton = status === 'loading' && tasks.length === 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
      {status === 'error' && (
        <div className="mb-4">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatsCard label="Total des tâches" value={stats.total} icon={ListChecksIcon} />
        <StatsCard
          label="Terminées"
          value={stats.completed}
          icon={CheckCircleIcon}
          tone="green"
        />
        <StatsCard label="En cours" value={stats.inProgress} icon={ClockIcon} tone="brand" />
        <StatsCard
          label="En retard"
          value={stats.overdue}
          icon={ClockAlertIcon}
          tone="red"
        />
        <StatsCard
          label="À faire aujourd'hui"
          value={stats.dueToday}
          icon={CalendarIcon}
          tone="gold"
        />
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TaskFilters
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => changeView('list')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                  view === 'list' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-strong'
                }`}
              >
                <ListChecksIcon size={14} />
                Liste
              </button>
              <button
                type="button"
                onClick={() => changeView('kanban')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                  view === 'kanban' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-strong'
                }`}
              >
                <KanbanIcon size={14} />
                Kanban
              </button>
            </div>
          </div>

          <ActiveFilterChips filters={filters} onChange={setFilters} />

          {showSkeleton ? (
            <div className="space-y-2 rounded-2xl border border-border bg-surface p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : view === 'list' ? (
            <TaskList
              tasks={filteredTasks}
              allTasksCount={activeTasks.length}
              hasActiveFilters={hasActiveFilters}
              sortBy={filters.sortBy}
              onOpen={(task) => openDetails(task.id)}
              onToggleDone={handleToggleDone}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onCreate={() => openCreate()}
              onResetFilters={resetFilters}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onOpen={(task) => openDetails(task.id)}
              onToggleDone={handleToggleDone}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onQuickAdd={(taskStatus) => openCreate(taskStatus)}
            />
          )}

          <ArchivedSection
            tasks={archivedTasks}
            onOpen={(task) => openDetails(task.id)}
            onRestore={handleRestore}
            onDelete={handleDelete}
          />
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <ProgressWidget stats={stats} />
          <UpcomingDeadlinesWidget tasks={activeTasks} />
          <WorkloadWidget tasks={activeTasks} />
        </aside>
      </div>
    </div>
  );
}
