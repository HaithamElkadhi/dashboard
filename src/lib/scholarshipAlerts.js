import { addDaysISO, todayISO } from './taskDates.js';

const WINDOW_DAYS = 15;

/** Calendar-day difference: ddl − today (can be 0). */
export function daysUntilDDL(ddl, today = todayISO()) {
  if (!ddl) return null;
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = ddl.split('-').map(Number);
  const t0 = Date.UTC(y1, m1 - 1, d1);
  const t1 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t0) / 86400000);
}

/** Empty status or "Not Started" — still need action before DDL. */
export function isScholarshipAlertEligible(status) {
  const s = (status || '').trim().toLowerCase();
  return !s || s === 'not started';
}

/**
 * Prospects whose scholarship DDL is today or within the next `windowDays`
 * (default 15), and status is empty or Not Started. Sorted soonest-first.
 * Skips empty DDLs, overdue ones, and already-in-progress statuses.
 */
export function prospectsWithUpcomingScholarshipDDL(
  prospects,
  { today = todayISO(), windowDays = WINDOW_DAYS } = {}
) {
  const limit = addDaysISO(today, windowDays);
  return prospects
    .filter((p) => {
      if (!isScholarshipAlertEligible(p.scholarshipStatus)) return false;
      const ddl = p.scholarshipDDL;
      if (!ddl) return false;
      return ddl >= today && ddl <= limit;
    })
    .map((p) => ({
      ...p,
      daysLeft: daysUntilDDL(p.scholarshipDDL, today),
    }))
    .sort((a, b) =>
      a.scholarshipDDL < b.scholarshipDDL
        ? -1
        : a.scholarshipDDL > b.scholarshipDDL
          ? 1
          : (a.fullName || '').localeCompare(b.fullName || '')
    );
}
