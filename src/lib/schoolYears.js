export function normalizeIntake(raw) {
  const v = String(raw || '').trim();
  const m = v.match(/^(\d{2}|\d{4})\s*[-/–]\s*(\d{2}|\d{4})$/);
  if (!m) return v;
  const full = (y) => (y.length === 2 ? `20${y}` : y);
  return `${full(m[1])}/${full(m[2])}`;
}
