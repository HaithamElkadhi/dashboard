// Shared task-metrics computation — used by the workspace's stat cards and
// right-side widgets, and by the Reports page, so both read from one place.
import { ARCHIVED_STATUS, ASSIGNEES, TASK_STATUSES } from './config.js';
import { isTaskOverdue, todayISO } from './taskDates.js';

export function computeTaskStats(tasks, today = todayISO()) {
  const activeTasks = tasks.filter((t) => t.status !== ARCHIVED_STATUS);
  let completed = 0;
  let overdue = 0;
  let inProgress = 0;
  let blocked = 0;
  let dueToday = 0;
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));

  for (const t of activeTasks) {
    if (TASK_STATUSES.includes(t.status)) byStatus[t.status] += 1;
    if (t.status === 'Done') completed += 1;
    if (t.status === 'In progress') inProgress += 1;
    if (t.status === 'Blocked') blocked += 1;
    if (isTaskOverdue(t, today)) overdue += 1;
    if (t.ddl === today && t.status !== 'Done') dueToday += 1;
  }

  return {
    total: activeTasks.length,
    completed,
    overdue,
    inProgress,
    blocked,
    dueToday,
    byStatus,
    archivedCount: tasks.length - activeTasks.length,
  };
}

export function computeWorkload(tasks) {
  const activeTasks = tasks.filter((t) => t.status !== ARCHIVED_STATUS);
  return ASSIGNEES.map((name) => {
    const row = { name, Todo: 0, 'In progress': 0, Blocked: 0, Done: 0, Total: 0 };
    for (const t of activeTasks) {
      if (t.assignedTo !== name) continue;
      row.Total += 1;
      if (row[t.status] != null) row[t.status] += 1;
    }
    return row;
  });
}

export function computeOverdueList(tasks, today = todayISO()) {
  return tasks
    .filter((t) => t.status !== ARCHIVED_STATUS && isTaskOverdue(t, today))
    .sort((a, b) => (a.ddl < b.ddl ? -1 : 1));
}
