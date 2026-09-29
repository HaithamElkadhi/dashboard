// Goal (MOS) helpers. Targets come from the goal; results are computed
// automatically from Airtable data for the goal's period:
// - Leads      = rows created in the LEADS table during the period
// - Prospects  = people whose "📅 Date Prospect" is in the period
// - Candidates = people whose "📅 Date Candidate" is in the period
// (those dates = first time the stage was reached, never overwritten; while a
// date is still empty, the person's first entry in the Log table is used).
// Someone who later moves on (to Candidate, Lost…) still counts.
// Plus the collection rate: paid / invoiced for the period (Paiements).

import { PAID_STATUS } from './config.js';

export const GOAL_METRICS = [
  { key: 'leads', label: 'Nouveaux leads', emoji: '🧲', target: 'targetLeads' },
  { key: 'prospects', label: 'Nouveaux prospects', emoji: '🙋', target: 'targetProspects', situation: 'Prospect' },
  { key: 'candidates', label: 'Nouveaux candidates', emoji: '🎓', target: 'targetCandidates', situation: 'Candidate' },
];

const DAY = 86400000;

export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function formatMoneyDT(n) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0)} DT`;
}

export function formatRange(startIso, endIso) {
  const s = parseISODate(startIso);
  const e = parseISODate(endIso);
  const fmt = (d, withYear) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  if (s && e) return `${fmt(s, s.getFullYear() !== e.getFullYear())} → ${fmt(e, true)}`;
  if (e) return `Jusqu'au ${fmt(e, true)}`;
  if (s) return `Depuis le ${fmt(s, true)}`;
  return 'Période non définie';
}

/** Where today falls in the goal's period. */
export function goalTiming(goal) {
  const s = parseISODate(goal.startDate);
  const e = parseISODate(goal.endDate);
  const t = today();
  if (!e) return { phase: s && s > t ? 'upcoming' : 'active', elapsed: null, daysLeft: null, totalDays: null };
  const start = s || e;
  const totalDays = Math.max(1, Math.round((e - start) / DAY) + 1);
  if (t < start) return { phase: 'upcoming', elapsed: 0, daysLeft: Math.round((e - t) / DAY), totalDays, startsIn: Math.round((start - t) / DAY) };
  if (t > e) return { phase: 'ended', elapsed: 1, daysLeft: 0, totalDays };
  const dayIndex = Math.round((t - start) / DAY) + 1;
  return { phase: 'active', elapsed: dayIndex / totalDays, daysLeft: Math.round((e - t) / DAY), totalDays, dayIndex };
}

// Is an ISO date/datetime inside [startIso, endIso] (whole days)?
function inPeriod(iso, startIso, endIso) {
  const day = String(iso || '').slice(0, 10);
  return Boolean(day) && (!startIso || day >= startIso) && (!endIso || day <= endIso);
}

// Date each person first entered `situation` according to the Log. The Log
// only stores the new situation, so "entered" = this entry has it and the
// person's previous entry didn't.
function firstEntryFromLog(logs, situation) {
  const byPerson = new Map();
  logs.forEach((l) => {
    if (!byPerson.has(l.prospectId)) byPerson.set(l.prospectId, []);
    byPerson.get(l.prospectId).push(l);
  });
  const first = new Map();
  byPerson.forEach((entries, id) => {
    entries.sort((a, b) => a.at.localeCompare(b.at));
    const hit = entries.find(
      (e, i) => e.situations.includes(situation) && !(i > 0 && entries[i - 1].situations.includes(situation))
    );
    if (hit) first.set(id, hit.at.slice(0, 10));
  });
  return first;
}

// People who reached `situation` for the first time during the period:
// their stage date field, or else their first Log entry into it.
function countEntries(sources, situation, startIso, endIso) {
  const fromLog = firstEntryFromLog(sources.logs, situation);
  const ids = new Set([...Object.keys(sources.stageDates || {}), ...fromLog.keys()]);
  let count = 0;
  ids.forEach((id) => {
    const date = sources.stageDates?.[id]?.[situation] || fromLog.get(id);
    if (inPeriod(date, startIso, endIso)) count += 1;
  });
  return count;
}

/** Results of a goal for its period, from fetchGoalSources() data. */
export function computeGoalActuals(goal, sources) {
  if (!sources) return null;
  const { startDate: s, endDate: e } = goal;
  const actuals = {
    leads: sources.leadDates.filter((d) => inPeriod(d, s, e)).length,
    prospects: countEntries(sources, 'Prospect', s, e),
    candidates: countEntries(sources, 'Candidate', s, e),
  };
  // Collection rate per currency (no conversion): paid / invoiced.
  const byCurrency = {};
  sources.payments
    .filter((p) => inPeriod(p.date, s, e))
    .forEach((p) => {
      const c = (byCurrency[p.currency] ||= { currency: p.currency, invoiced: 0, paid: 0 });
      c.invoiced += p.amount;
      if (p.status === PAID_STATUS) c.paid += p.amount;
    });
  // One line per currency (TND first), never mixed: rate = paid / invoiced.
  actuals.collection = Object.values(byCurrency)
    .filter((c) => c.invoiced > 0)
    .map((c) => ({ ...c, rate: c.paid / c.invoiced }))
    .sort((x, y) => (x.currency === 'TND' ? -1 : y.currency === 'TND' ? 1 : x.currency.localeCompare(y.currency)));
  return actuals;
}

/** Metrics that have a target, with their progress (0–1+, uncapped). */
export function goalProgress(goal, actuals) {
  const metrics = GOAL_METRICS.filter((m) => goal[m.target] > 0).map((m) => {
    const target = goal[m.target];
    const hasActual = actuals != null;
    const actual = hasActual ? actuals[m.key] : 0;
    return { ...m, targetValue: target, actualValue: actual, ratio: actual / target, hasActual };
  });
  // Collection target (%): progress = rate reached ÷ rate aimed, averaged
  // over the currencies invoiced in the period.
  const collectionTarget = goal.targetCollection > 0 ? goal.targetCollection / 100 : null;
  const currencies = actuals?.collection || [];
  if (collectionTarget && actuals) {
    const ratio = currencies.length
      ? currencies.reduce((sum, c) => sum + c.rate / collectionTarget, 0) / currencies.length
      : 0;
    metrics.push({ key: 'collection', label: 'Encaissement', emoji: '💰', ratio, hasActual: true, collection: true });
  }
  const overall = metrics.length
    ? metrics.reduce((sum, m) => sum + Math.min(m.ratio, 1), 0) / metrics.length
    : null;
  return { metrics, overall };
}

// Colour of one metric's bar: compared with how much of the period is gone.
export function paceTone(ratio, elapsed) {
  if (ratio >= 1) return 'good';
  if (elapsed == null || elapsed < 0.15) return 'neutral';
  const pace = ratio / elapsed;
  if (pace >= 0.9) return 'good';
  if (pace >= 0.6) return 'warn';
  return 'bad';
}

/** { label, tone, emoji } for the goal's status pill. */
export function goalStatus(goal, actuals) {
  const timing = goalTiming(goal);
  const { metrics, overall } = goalProgress(goal, actuals);
  if (!metrics.length) return { label: 'Aucune cible', tone: 'neutral', emoji: '📝', timing, overall };
  if (overall >= 1) return { label: 'Atteint', tone: 'good', emoji: '🏆', timing, overall };
  if (timing.phase === 'upcoming') return { label: 'À venir', tone: 'neutral', emoji: '🗓️', timing, overall };
  if (timing.phase === 'ended') return { label: 'Non atteint', tone: 'bad', emoji: '⛔', timing, overall };
  const tone = paceTone(overall, timing.elapsed);
  if (tone === 'neutral') return { label: 'Démarré', tone: 'neutral', emoji: '🚀', timing, overall };
  if (tone === 'good') return { label: 'Dans les temps', tone: 'good', emoji: '🟢', timing, overall };
  if (tone === 'warn') return { label: 'À surveiller', tone: 'warn', emoji: '🟠', timing, overall };
  return { label: 'En retard', tone: 'bad', emoji: '🔴', timing, overall };
}

/** Default dates for a period type, from a reference date (ISO). */
export function periodDates(periodType, refIso) {
  const ref = parseISODate(refIso) || today();
  if (periodType === '📅 Monthly') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }
  if (periodType === '📆 Weekly') {
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: toISODate(monday), endDate: toISODate(sunday) };
  }
  return null;
}

/** Suggested name, e.g. "Octobre 2026" / "Semaine du 5 oct. 2026". */
export function defaultGoalName(periodType, startIso) {
  const s = parseISODate(startIso);
  if (!s) return '';
  if (periodType === '📅 Monthly') {
    const m = s.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }
  if (periodType === '📆 Weekly') {
    return `Semaine du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return '';
}
