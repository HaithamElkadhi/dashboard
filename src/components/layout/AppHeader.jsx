import { useLocation, useNavigate } from 'react-router-dom';
import { useTasksWorkspace } from '../../contexts/TasksWorkspaceContext.jsx';
import { usePageRefreshInfo } from '../../contexts/PageRefreshContext.jsx';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { relativeTime } from '../../lib/taskDates.js';
import Avatar from '../Avatar.jsx';
import BookingNotificationBell from '../bookings/BookingNotificationBell.jsx';
import { MenuIcon, PlusIcon, RefreshIcon } from '../icons.jsx';

export default function AppHeader({ title, onOpenMobileSidebar }) {
  const { openCreate } = useTasksWorkspace();
  const { lastUpdated, refresh, loading } = usePageRefreshInfo();
  const [currentUser] = useCurrentUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Pages where the global "Nouvelle tâche" button is hidden.
  const hideNewTask = pathname.startsWith('/students/') || ['/', '/finance', '/performance', '/operations/proposal-italy', '/operations/application', '/operations/integration', '/operations/admission-documents', '/notes', '/admin/users'].includes(
    pathname
  );

  return (
    <header className="z-20 shrink-0 border-b border-border bg-surface px-4 py-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="min-h-11 min-w-11 rounded-lg p-2.5 text-text-muted hover:bg-canvas lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon size={18} />
        </button>

        <h1 className="min-w-0 shrink truncate text-xl font-semibold text-navy sm:text-2xl">
          {title}
        </h1>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {refresh && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              title="Actualiser"
              className="hidden items-center gap-1.5 min-h-11 rounded-lg px-3 py-2 text-xs text-text-muted transition hover:bg-canvas disabled:opacity-60 md:inline-flex"
            >
              <RefreshIcon size={12} className={loading ? 'animate-spin' : ''} />
              {lastUpdated ? `Mis à jour ${relativeTime(lastUpdated)}` : 'Actualiser'}
            </button>
          )}

          <BookingNotificationBell />

          <Avatar fullName={currentUser} seed={currentUser} />

          {!hideNewTask && (
            <button data-write=""
              type="button"
              aria-label={pathname === '/ticketing' ? 'New ticket' : 'New task'}
              onClick={() => pathname === '/ticketing' ? navigate('/ticketing?new=1') : openCreate()}
              className="inline-flex items-center min-h-11 min-w-11 justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <PlusIcon size={18} />
              <span className="hidden sm:inline">{pathname === '/ticketing' ? 'New ticket' : 'New task'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
