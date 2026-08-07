import { createContext, useCallback, useContext, useState } from 'react';
import { useTasksData } from '../hooks/useTasksData.js';

// Tasks data + the create/detail drawer open state are shared app-wide (not
// just on /tasks) so the header's global search, notification bell and
// "+ Nouvelle tâche" button work identically from any page, and the task
// list is only ever fetched once instead of once per consumer.
const TasksWorkspaceContext = createContext(null);

export function TasksWorkspaceProvider({ children }) {
  const data = useTasksData();
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState(null);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [toast, setToast] = useState('');

  const openCreate = useCallback((initialStatus) => {
    setCreateInitialStatus(initialStatus || null);
    setCreateOpen(true);
  }, []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const openDetails = useCallback((taskId) => setDetailTaskId(taskId), []);
  const closeDetails = useCallback(() => setDetailTaskId(null), []);
  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(''), 4500);
  }, []);
  const hideToast = useCallback(() => setToast(''), []);

  const value = {
    ...data,
    createOpen,
    createInitialStatus,
    openCreate,
    closeCreate,
    detailTaskId,
    openDetails,
    closeDetails,
    toast,
    showToast,
    hideToast,
  };

  return (
    <TasksWorkspaceContext.Provider value={value}>
      {children}
    </TasksWorkspaceContext.Provider>
  );
}

export function useTasksWorkspace() {
  const ctx = useContext(TasksWorkspaceContext);
  if (!ctx) {
    throw new Error('useTasksWorkspace must be used within TasksWorkspaceProvider');
  }
  return ctx;
}
