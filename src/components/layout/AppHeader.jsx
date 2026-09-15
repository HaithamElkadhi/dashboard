import { useEffect, useMemo, useRef, useState } from 'react';
import { useTasksWorkspace } from '../../contexts/TasksWorkspaceContext.jsx';
import { usePageRefreshInfo } from '../../contexts/PageRefreshContext.jsx';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { ARCHIVED_STATUS } from '../../lib/config.js';
import { formatShortDate, isTaskOverdue, relativeTime, todayISO } from '../../lib/taskDates.js';
import Avatar from '../Avatar.jsx';
import { BellIcon, MenuIcon, PlusIcon, RefreshIcon } from '../icons.jsx';

function useOutsideClose(ref, active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, active, onClose]);
}

export default function AppHeader({ title, onOpenMobileSidebar }) {
  const { tasks, openCreate, openDetails } = useTasksWorkspace();
  const { lastUpdated, refresh, loading } = usePageRefreshInfo();
  const [currentUser] = useCurrentUser();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  useOutsideClose(notifRef, notifOpen, () => setNotifOpen(false));

  const today = todayISO();
  const notifications = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.status !== ARCHIVED_STATUS &&
            t.status !== 'Done' &&
            (isTaskOverdue(t, today) || t.ddl === today)
        )
        .sort((a, b) => (a.ddl < b.ddl ? -1 : 1))
        .slice(0, 8),
    [tasks, today]
  );

  const openResult = (task) => {
    openDetails(task.id);
    setNotifOpen(false);
  };

  return (
    <header className="z-20 shrink-0 border-b border-border bg-surface px-4 py-2.5 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-1.5 text-text-muted hover:bg-canvas lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon size={18} />
        </button>

        <h1 className="min-w-0 shrink truncate text-sm font-semibold text-text-strong sm:text-base">
          {title}
        </h1>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {refresh && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              title="Actualiser"
              className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted transition hover:bg-canvas disabled:opacity-60 md:inline-flex"
            >
              <RefreshIcon size={12} className={loading ? 'animate-spin' : ''} />
              {lastUpdated ? `Mis à jour ${relativeTime(lastUpdated)}` : 'Actualiser'}
            </button>
          )}

          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              title="Notifications"
              aria-label="Notifications"
              className="relative rounded-lg p-1.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
            >
              <BellIcon size={18} />
              {notifications.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  En retard et échéance aujourd’hui
                </div>
                {notifications.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-text-muted">
                    Rien à signaler pour le moment.
                  </p>
                ) : (
                  <ul className="max-h-80 divide-y divide-border overflow-y-auto scroll-thin">
                    {notifications.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => openResult(t)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-canvas"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-text-strong">
                              {t.name}
                            </span>
                            <span className="block truncate text-xs text-text-muted">
                              {t.assignedTo || '—'}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 text-xs font-semibold tabular-nums ${
                              isTaskOverdue(t, today) ? 'text-red-600' : 'text-text-muted'
                            }`}
                          >
                            {formatShortDate(t.ddl)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <Avatar fullName={currentUser} seed={currentUser} />

          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <PlusIcon size={15} />
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </button>
        </div>
      </div>
    </header>
  );
}
