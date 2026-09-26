// Maps a normalized Paiement record (see normalizePaiement in airtable.js)
// to the editable invoice / receipt form data. Same rules as the v0
// generator's Paiement page prefill.
import { DOC_CURRENCIES } from './constants.js';

const today = () => new Date().toISOString().split('T')[0];

function normalizeCurrency(value) {
  const upper = String(value || '').trim().toUpperCase();
  return DOC_CURRENCIES.includes(upper) ? upper : 'EUR';
}

function normalizePaymentMethod(value) {
  const n = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (n.includes('bank') || n.includes('transfer') || n.includes('virement')) return 'bank_transfer';
  if (n.includes('card') || n.includes('carte')) return 'credit_card';
  if (n.includes('mobile')) return 'mobile_money';
  if (n.includes('paypal')) return 'other';
  if (n.includes('cash') || n.includes('espece') || n.includes('espèce')) return 'cash';
  return 'other';
}

// TND payments are wired to the Tunisian account; everything else to Italy.
function invoicePaymentMethods(paiement, currency) {
  const n = String(paiement.paymentMethod || '').toLowerCase();
  if (n.includes('paypal')) {
    return { bankTransferItaly: false, bankTransferTunisia: false, other: true };
  }
  return currency === 'TND'
    ? { bankTransferItaly: false, bankTransferTunisia: true, other: false }
    : { bankTransferItaly: true, bankTransferTunisia: false, other: false };
}

function purposeLabel(paiement) {
  return (paiement.purpose || []).filter(Boolean).join(', ');
}

let itemSeq = 0;
export function newInvoiceItem(description = '', unitPrice = 0) {
  itemSeq += 1;
  return { id: `item-${Date.now()}-${itemSeq}`, description, quantity: 1, unitPrice };
}

export function invoiceFromPaiement(paiement) {
  const currency = normalizeCurrency(paiement.currency);
  return {
    invoiceNumber: paiement.reference || '',
    date: paiement.paymentDate || today(),
    dueDate: paiement.dueDate || '',
    currency,
    clientName: paiement.fullName || '',
    clientEmail: paiement.email || '',
    clientAddress: paiement.billingAddress || '',
    items: [newInvoiceItem(purposeLabel(paiement) || 'Payment', Number(paiement.amount) || 0)],
    discountEnabled: false,
    discountPercentage: 0,
    discountReason: '',
    paymentMethods: invoicePaymentMethods(paiement, currency),
  };
}

export function receiptFromPaiement(paiement) {
  return {
    invoiceId: paiement.reference || '',
    paymentDate: paiement.paymentDate || today(),
    paymentReason: purposeLabel(paiement),
    clientName: paiement.fullName || '',
    clientEmail: paiement.email || '',
    clientPhone: '',
    clientAddress: paiement.billingAddress || '',
    paymentMethod: normalizePaymentMethod(paiement.paymentMethod),
    currency: normalizeCurrency(paiement.currency),
    amount: Number(paiement.amount) || 0,
    comment: paiement.comment || '',
  };
}
