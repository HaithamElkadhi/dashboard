/**
 * Students with at least one application who are not yet Admitted.
 */
export function pendingStudents(prospects) {
  return prospects
    .filter((p) => {
      const n = Number(p.nbrApplications) || 0;
      if (n <= 0) return false;
      return !(p.situations || []).includes('Admitted');
    })
    .slice()
    .sort((a, b) => {
      const na = Number(a.nbrApplications) || 0;
      const nb = Number(b.nbrApplications) || 0;
      if (nb !== na) return nb - na;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
}
