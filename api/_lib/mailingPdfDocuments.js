import { readFile } from 'node:fs/promises';
import { normalizeProposalRecord } from '../../src/lib/airtable.js';
import { FIN, PF } from '../../src/lib/config.js';
import { buildProposalItalyPdf } from '../../src/lib/proposalItaly/pdf.js';
import { buildInvoicePdf, invoiceFilename } from '../../src/lib/financeDocs/invoicePdf.js';
import { invoiceFromPaiement } from '../../src/lib/financeDocs/fromPaiement.js';
import { buildDocFilename } from '../../src/lib/financeDocs/constants.js';

// Only these bundled brand files can be loaded: no remote URLs or user paths.
const ASSETS = new Map([
  ['/fonts/poppins/Poppins-Regular.ttf', new URL('../../public/fonts/poppins/Poppins-Regular.ttf', import.meta.url)],
  ['/fonts/poppins/Poppins-SemiBold.ttf', new URL('../../public/fonts/poppins/Poppins-SemiBold.ttf', import.meta.url)],
  ['/images/jeexpert-content/logo-pdf.png', new URL('../../public/images/jeexpert-content/logo-pdf.png', import.meta.url)],
]);
async function assetLoader(path) {
  const file = ASSETS.get(path);
  if (!file) throw new Error('Unsupported PDF brand asset');
  return (await readFile(file)).toString('base64');
}
const array = value => Array.isArray(value) ? value : value == null ? [] : [value];
const first = value => String(array(value)[0] || '');
const attachment = (doc, filename) => ({ filename, content: Buffer.from(doc.output('arraybuffer')).toString('base64') });

export async function buildMailingProposal(record) {
  const data = normalizeProposalRecord(record);
  const doc = await buildProposalItalyPdf(data, { assetLoader });
  return attachment(doc, buildDocFilename('Proposal', {
    clientName: data.studentName, reference: record.id, date: data.proposalDate,
  }));
}

// Caller validates access and the payment's prospect record link before building.
export async function buildMailingInvoice(paymentRecord, studentRecord) {
  const f = paymentRecord.fields || {}, student = studentRecord.fields || {};
  const amount = parseFloat(String(f[FIN.amount] ?? '').replace(/[^\d.-]/g, ''));
  const data = invoiceFromPaiement({
    reference: f[FIN.reference] || '',
    paymentDate: f[FIN.paymentDate] || null,
    dueDate: f[FIN.dueDate] || '',
    currency: f[FIN.currency] || 'EUR',
    fullName: student[PF.fullName] || [student[PF.name], student[PF.surname]].filter(Boolean).join(' ') || first(f[FIN.fullName]),
    email: student[PF.email] || first(f[FIN.email]),
    billingAddress: f[FIN.billingAddress] || '',
    purpose: array(f[FIN.purpose]),
    amount: Number.isFinite(amount) ? amount : 0,
    paymentMethod: f[FIN.paymentMethod] || '',
  });
  const doc = await buildInvoicePdf(data, { assetLoader });
  return attachment(doc, invoiceFilename(data));
}
