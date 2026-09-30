// Company / bank constants and formatters for the Facture & Reçu PDFs.
// Ported 1:1 from v0-invoice-generator-spec (lib/invoice-types.ts and
// lib/payment-receipt-types.ts) so the PDFs match the generator exactly.

export const COMPANY_INFO = {
  name: 'Jeexpert',
  email: 'contact@jeexpert-study.com',
  phone: '+39 352 088 0880',
  website: 'www.jeexpert-study.com',
  logoUrl: '/images/jeexpert-20logo-20inversed.png',
};

/** Intesa Sanpaolo (Italy) */
export const BANK_DETAILS_IT = {
  accountHolder: 'Haitham ELKADHI',
  codiceFiscale: 'LKDHHM94E25Z352S',
  iban: 'IT70 Y030 6915 2241 0000 0008 290',
  bic: 'BCITITMM',
  bank: 'Intesa Sanpaolo',
};

/** Tunisia (TND) — ABC Bank */
export const BANK_DETAILS_TN = {
  bank: 'ABC Bank',
  accountType: 'Compte courant en TND',
  beneficiary: 'SOCIETE JEEXPERT',
  address: 'Rue du Lac Annecy, Lac I',
  rib: '28000043081100000186',
  iban: 'TN5928000043081100000186',
  swiftBic: 'ABCOTNTT001',
};

export const BRAND_COLORS = {
  primary: { r: 41, g: 84, b: 144 },
  accent: { r: 220, g: 53, b: 69 },
};

export const DOC_CURRENCIES = ['EUR', 'USD', 'TND'];

export const CURRENCY_LABELS = {
  EUR: 'Euro (EUR)',
  USD: 'Dollar (USD)',
  TND: 'Dinar tunisien (TND)',
};

export const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  credit_card: 'Credit Card',
  mobile_money: 'Mobile Money',
  other: 'Other',
};

export function formatInvoiceCurrency(amount, currency) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
export function formatDocDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : dateStr;
}

export function computeInvoiceTotals(data) {
  const subtotal = data.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const discountAmount = data.discountEnabled
    ? subtotal * ((Number(data.discountPercentage) || 0) / 100)
    : 0;
  return { subtotal, discountAmount, finalTotal: subtotal - discountAmount };
}

// e.g. "Jeexpert_Invoice_Saif-Boujemaa_PAY-TUNSB28-1146_2026-09-26.pdf" —
// accents stripped and unsafe characters dropped so it's valid everywhere
// (Windows, mail clients, Airtable attachments).
export function buildDocFilename(kind, { clientName, reference, date }) {
  const clean = (v) =>
    String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  const parts = ['Jeexpert', kind, clean(clientName), clean(reference), clean(String(date || '').slice(0, 10))];
  return `${parts.filter(Boolean).join('_')}.pdf`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
