export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isTaskOverdue(task, today = todayISO()) {
  if (!task.ddl) return false;
  if (task.status === 'Done' || task.status === 'Archived') return false;
  return task.ddl < today;
}

export function formatShortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Buckets tasks the way the list view groups them. Order in the returned
// object is not the display order — overdue is surfaced first in the UI even
// though it's listed last in the product spec, since it's the most urgent.
export function groupTasksByDate(tasks, today = todayISO()) {
  const groups = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDeadline: [],
  };
  const tomorrowISO = addDaysISO(today, 1);
  const weekEndISO = addDaysISO(today, 7);

  for (const task of tasks) {
    if (isTaskOverdue(task, today)) {
      groups.overdue.push(task);
    } else if (!task.ddl) {
      groups.noDeadline.push(task);
    } else if (task.ddl === today) {
      groups.today.push(task);
    } else if (task.ddl === tomorrowISO) {
      groups.tomorrow.push(task);
    } else if (task.ddl > today && task.ddl <= weekEndISO) {
      groups.thisWeek.push(task);
    } else {
      groups.later.push(task);
    }
  }
  return groups;
}

// The Ticket ID formula embeds the creation date (e.g. "TSK-20260806-djQ4K")
// — Airtable has no separate created-time field, so this is the only real
// signal available for "created on" without adding a new backend field.
export function parseTicketCreatedDate(ticketId) {
  const m = /^TSK-(\d{4})(\d{2})(\d{2})-/.exec(ticketId || '');
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}`;
}

export function relativeTime(date) {
  if (!date) return '';
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}
