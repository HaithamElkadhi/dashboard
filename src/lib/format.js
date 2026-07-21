const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const tndFmt = new Intl.NumberFormat('fr-TN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatEUR(n) {
  return eurFmt.format(n || 0);
}

export function formatTND(n) {
  return `${tndFmt.format(n || 0)} TND`;
}

export function initials(first, last, fullName) {
  const a = (first || '').trim();
  const b = (last || '').trim();
  if (a || b) {
    return `${a[0] || ''}${b[0] || ''}`.toUpperCase() || '?';
  }
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function titleCase(str) {
  return (str || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
