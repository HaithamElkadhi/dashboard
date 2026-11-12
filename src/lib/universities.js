const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const dayMs = 86_400_000;
export const admissionWindowDays = 30;
const tunisDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Tunis' });

export function parseAdmissionDate(value) {
  const text = String(value ?? '').trim().toLowerCase();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const monthFirst = /^([a-z]+)\s+(\d{1,2})[,.]?\s+(\d{4})$/.exec(text);
  const dayFirst = /^(\d{1,2})\s+([a-z]+)[,.]?\s+(\d{4})$/.exec(text);
  let year, month, day;
  if (iso) [, year, month, day] = iso;
  else {
    const match = monthFirst || dayFirst;
    if (!match) return null;
    year = match[3];
    day = match[monthFirst ? 2 : 1];
    const monthName = match[monthFirst ? 1 : 2];
    const fullMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    month = 1 + (monthName.length === 3 ? months.indexOf(monthName) : fullMonths.indexOf(monthName));
  }
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const time = Date.parse(key);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === key ? time : null;
}

export function admissionStatus(session, now = new Date()) {
  const opening = parseAdmissionDate(session.opening);
  const deadline = parseAdmissionDate(session.deadline);
  if (opening !== null && deadline !== null && opening > deadline) return {};

  const publishedStatus = /(?:^|;)\s*statut publié\s*:\s*(open|closed)\s*$/i.exec(session.notes ?? '')?.[1]?.toLowerCase();
  const today = Date.parse(tunisDate.format(now));
  const horizon = today + admissionWindowDays * dayMs;
  const future = opening !== null && opening > today;
  const past = deadline !== null && deadline < today;
  const closed = past || (!future && publishedStatus === 'closed');
  const open = !closed && !future && (publishedStatus === 'open' || (opening !== null && deadline !== null));
  return {
    open,
    soon: future && opening <= horizon,
    planned: future && opening > horizon,
    closed,
    deadlines: open && deadline !== null && deadline <= horizon,
  };
}

export function safeUniversityUrl(value) {
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol)) return url.href;
  } catch { /* The source may contain plain text. */ }
  return null;
}

export function universitySearchKey(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
