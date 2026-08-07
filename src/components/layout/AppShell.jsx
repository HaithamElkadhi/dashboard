import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar.jsx';
import AppHeader from './AppHeader.jsx';
import { PAGE_TITLES } from '../../lib/navigation.js';
import { TasksWorkspaceProvider, useTasksWorkspace } from '../../contexts/TasksWorkspaceContext.jsx';
import TaskCreateModal from '../tasks/TaskCreateModal.jsx';
import TaskDetailsModal from '../tasks/TaskDetailsModal.jsx';
import Toast from '../Toast.jsx';

const COLLAPSE_KEY = 'jeexpert:sidebar:collapsed';

function GlobalTaskModals() {
  const {
    tasks,
    people,
    create,
    update,
    remove,
    quickUpdateStatus,
    createOpen,
    createInitialStatus,
    closeCreate,
    detailTaskId,
    closeDetails,
    toast,
    showToast,
    hideToast,
  } = useTasksWorkspace();

  const detailTask = tasks.find((t) => t.id === detailTaskId) || null;

  return (
    <>
      {createOpen && (
        <TaskCreateModal
          people={people}
          initialStatus={createInitialStatus}
          onClose={closeCreate}
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

  const title = PAGE_TITLES[location.pathname] || 'JEExpert';

  return (
    <TasksWorkspaceProvider>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppHeader title={title} onOpenMobileSidebar={() => setMobileOpen(true)} />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalTaskModals />
    </TasksWorkspaceProvider>
  );
}
