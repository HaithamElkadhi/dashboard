import { ADMITTED_SITUATION } from './config.js';

/**
 * Students with at least one application who are not yet admitted.
 */
export function pendingStudents(prospects) {
  return prospects
    .filter((p) => {
      const n = Number(p.nbrApplications) || 0;
      if (n <= 0) return false;
      return !(p.situations || []).includes(ADMITTED_SITUATION);
    })
    .slice()
    .sort((a, b) => {
      const na = Number(a.nbrApplications) || 0;
      const nb = Number(b.nbrApplications) || 0;
      if (nb !== na) return nb - na;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
}
