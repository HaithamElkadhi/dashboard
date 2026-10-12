export function matchesTaskAssignee(task, selection, userId) {
  if (selection === 'All') return true;
  const assigneeId = selection === 'Mine' ? userId : selection;
  return Boolean(assigneeId) && task.assignedUserId === assigneeId;
}
