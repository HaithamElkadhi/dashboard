export const TICKET_HISTORY_TABLE = 'tblphgbNKhd5xi0Zk';
export const TICKET_FIELDS = {
  recordKind: 'Type', subject: 'Objet', description: 'Description',
  linkedProspectIds: 'Linked Prospect', prospectName: 'Prospect Name',
  email: 'Client Email', phone: 'Client Phone', assignedTo: 'Assigned User ID',
  status: 'Task Status', priority: 'Priority', type: 'Task Type', ddl: 'DDL', notes: 'Notes',
};
export const isTicket = (task) => task.recordKind === 'Ticket';
export const isOpenTicket = (task) => isTicket(task) && !['Done', 'Archived'].includes(task.status);
export function tunisToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (key) => parts.find((p) => p.type === key).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export const ticketOverdue = (task, today = tunisToday()) => isOpenTicket(task) && Boolean(task.ddl && task.ddl < today);
export const ticketTitle = (task) => task.subject || task.description?.slice(0, 100) || task.ticketId || 'Untitled ticket';
export function ticketStats(tasks, today) {
  const open = tasks.filter(isOpenTicket);
  return { open: open.length, unassigned: open.filter((t) => !t.assignedTo).length, overdue: open.filter((t) => ticketOverdue(t, today)).length, blocked: open.filter((t) => t.status === 'Blocked').length };
}
export function selectTickets(tasks, filters, today = tunisToday()) {
  const q = (filters.query || '').trim().toLowerCase();
  const rank = { High: 0, Medium: 1, Low: 2 };
  return tasks.filter(isTicket).filter((t) => {
    if (filters.view === 'open' && !isOpenTicket(t)) return false;
    if (filters.view === 'unassigned' && (!isOpenTicket(t) || t.assignedTo)) return false;
    if (filters.view === 'overdue' && !ticketOverdue(t, today)) return false;
    if (filters.view === 'blocked' && t.status !== 'Blocked') return false;
    if (filters.view === 'resolved' && t.status !== 'Done') return false;
    if (filters.view === 'archived' && t.status !== 'Archived') return false;
    for (const key of ['assignedTo', 'priority', 'status', 'type']) if (filters[key] && t[key] !== filters[key]) return false;
    if (filters.due === 'today' && t.ddl !== today) return false;
    if (filters.due === 'none' && t.ddl) return false;
    return !q || [t.ticketId, t.subject, t.description, t.prospectName].some((v) => v?.toLowerCase().includes(q));
  }).sort((a, b) => {
    if (filters.sort === 'created') return (b.createdAt || '').localeCompare(a.createdAt || '');
    if (filters.sort === 'priority') return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || (b.createdAt || '').localeCompare(a.createdAt || '');
    return Number(ticketOverdue(b, today)) - Number(ticketOverdue(a, today)) || (a.ddl || '9999').localeCompare(b.ddl || '9999') || (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}
export function ticketPatch(current, next) {
  return Object.fromEntries(Object.keys(TICKET_FIELDS).filter((key) => key !== 'recordKind' && JSON.stringify(current[key] ?? '') !== JSON.stringify(next[key] ?? '')).map((key) => [key, next[key]]));
}
