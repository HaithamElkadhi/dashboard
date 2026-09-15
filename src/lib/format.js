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

const plainFmt = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Currency-aware amount formatter for the Finance section (EUR/USD/GBP use
// Intl currency formatting; TND has no reliable Intl currency support here).
export function formatMoney(n, currency) {
  const amount = n || 0;
  if (currency === 'TND') return `${plainFmt.format(amount)} TND`;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${plainFmt.format(amount)} ${currency || ''}`.trim();
  }
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

const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Format an Airtable dateTime ISO string for display. */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFmt.format(d);
}

/** Convert ISO → value for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value → ISO for Airtable. */
export function fromDatetimeLocalValue(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
