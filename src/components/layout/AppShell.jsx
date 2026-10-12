import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar.jsx';
import AppHeader from './AppHeader.jsx';
import { PAGE_TITLES } from '../../lib/navigation.js';
import { TasksWorkspaceProvider, useTasksWorkspace } from '../../contexts/TasksWorkspaceContext.jsx';
import { PageRefreshProvider } from '../../contexts/PageRefreshContext.jsx';
import TaskCreateModal from '../tasks/TaskCreateModal.jsx';
import TaskDetailsModal from '../tasks/TaskDetailsModal.jsx';
import Toast from '../Toast.jsx';
import ReadOnlyAccess from '../ReadOnlyAccess.jsx';
import { BookingNotificationsProvider } from '../../contexts/BookingNotificationsContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PlusIcon } from '../icons.jsx';

const COLLAPSE_KEY = 'jeexpert:sidebar:collapsed';

/** Create / detail task modals + toast — shared across all routes. */
function GlobalTaskModals() {
  const { canWrite } = useAuth();
  const createButtonRef = useRef(null);
  const {
    tasks,
    people,
    create,
    update,
    remove,
    quickUpdateStatus,
    createOpen,
    openCreate,
    createInitialStatus,
    closeCreate,
    detailTaskId,
    closeDetails,
    toast,
    showToast,
    hideToast,
  } = useTasksWorkspace();

  const detailTask = tasks.find((t) => t.id === detailTaskId) || null;
  const closeTaskCreate = () => {
    closeCreate();
    requestAnimationFrame(() => createButtonRef.current?.focus());
  };

  return (
    <>
      {canWrite && (
        <button
          ref={createButtonRef}
          type="button"
          data-write=""
          aria-label="New task"
          title="New task"
          aria-haspopup="dialog"
          onClick={() => openCreate()}
          className="fixed z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#173B65] text-white shadow-lg transition hover:bg-[#224e7f] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#80C4EA] focus-visible:ring-offset-2 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
          style={{ display: createOpen || detailTask || toast ? 'none' : undefined, right: 'max(20px, env(safe-area-inset-right))', bottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <PlusIcon size={24} />
        </button>
      )}
      {createOpen && (
        <TaskCreateModal
          people={people}
          initialStatus={createInitialStatus}
          onClose={closeTaskCreate}
          onCreate={create}
          onToast={showToast}
        />
      )}
      {detailTask && (
        <TaskDetailsModal
          task={detailTask}
          people={people}
          onClose={closeDetails}
          onUpdate={update}
          onDelete={remove}
          onStatusChange={quickUpdateStatus}
          onDuplicate={create}
          onToast={showToast}
        />
      )}
      <Toast message={toast} onClose={hideToast} />
    </>
  );
}

export default function AppShell() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const title = location.pathname.startsWith('/students/') && location.pathname.endsWith('/documents') ? 'Student documents' : PAGE_TITLES[location.pathname] || 'JEExpert';

  return (
    <PageRefreshProvider>
      <TasksWorkspaceProvider>
        <BookingNotificationsProvider>
        <div className="flex h-screen overflow-hidden bg-canvas">
          <AppSidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AppHeader title={title} onOpenMobileSidebar={() => setMobileOpen(true)} />
            <ReadOnlyAccess />
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-24">
              <Outlet />
            </main>
          </div>
        </div>
        <GlobalTaskModals />
        </BookingNotificationsProvider>
      </TasksWorkspaceProvider>
    </PageRefreshProvider>
  );
}
