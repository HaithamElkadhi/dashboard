// Shared identity for the KPIS snapshot metrics shown on the Performance page
// — one color per metric (dataviz categorical palette slots, validated
// against the app's white card surface). Funnel stages (Lead → Prospect →
// Candidate → Student) take the slots in stage order.
//
// "Admitted" is intentionally excluded from display — it stays a field on
// each snapshot (see lib/config.js KPI.admitted) but isn't shown here.
export const KPI_METRICS = [
  { key: 'totalProspect', label: 'Total Prospects', color: '#2a78d6' }, // slot 1 — blue
  { key: 'lead', label: 'Lead', color: '#4a3aa7' }, // slot 7 — violet
  { key: 'prospect', label: 'Prospect', color: '#1baf7a' }, // slot 3 — aqua
  { key: 'candidate', label: 'Candidate', color: '#eda100' }, // slot 4 — yellow
  { key: 'student', label: 'Student', color: '#eb6834' }, // slot 2 — orange
  { key: 'lost', label: 'Lost', color: '#e34948' }, // slot 8 — red
];

export function kpiMetric(key) {
  return KPI_METRICS.find((m) => m.key === key) || KPI_METRICS[0];
}
