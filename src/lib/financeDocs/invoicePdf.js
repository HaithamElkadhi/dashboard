import { jsPDF } from 'jspdf';
import { prepareBrand, drawBrandHeader, drawBrandFooter, brandTable, PDF_BRAND, PDF_FONT } from '../pdfBrand.js';
import {
  BANK_DETAILS_IT, BANK_DETAILS_TN, buildDocFilename, computeInvoiceTotals,
  formatDocDate, formatInvoiceCurrency,
} from './constants.js';

export function invoiceFilename(data) {
  return buildDocFilename('Invoice', {
    clientName: data.clientName, reference: data.invoiceNumber || 'DRAFT', date: data.date,
  });
}

export async function buildInvoicePdf(data) {
  const { subtotal, discountAmount, finalTotal } = computeInvoiceTotals(data);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brand = await prepareBrand(doc);
  const y = drawBrandHeader(doc, brand, { title: 'INVOICE', subtitle: 'Your academic journey, supported.' });
  const money = (value) => formatInvoiceCurrency(value, data.currency);
  const nextY = () => doc.lastAutoTable.finalY + 8;

  brandTable(doc, {
    startY: y,
    theme: 'plain',
    body: [
      [{ content: 'BILL TO', styles: { fontStyle: 'bold', textColor: PDF_BRAND.navy } }, { content: 'INVOICE DETAILS', styles: { fontStyle: 'bold', textColor: PDF_BRAND.navy } }],
      [data.clientName || '-', `Invoice No: ${data.invoiceNumber || 'DRAFT'}`],
      [data.clientAddress || '', `Date: ${formatDocDate(data.date)}\nDue Date: ${data.dueDate ? formatDocDate(data.dueDate) : '-'}`],
    ],
    columnStyles: { 0: { cellWidth: 94 }, 1: { cellWidth: 80 } },
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: 2, textColor: PDF_BRAND.ink },
  });

  brandTable(doc, {
    startY: nextY(),
    head: [['Description', 'QTY', 'Unit Price', 'Total']],
    body: data.items.filter((item) => item.description.trim()).map((item) => [
      item.description, String(item.quantity), money(Number(item.unitPrice) || 0),
      money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
    ]),
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 17, halign: 'right' }, 2: { cellWidth: 34, halign: 'right' }, 3: { cellWidth: 34, halign: 'right' } },
  });

  const totals = [['Subtotal', money(subtotal)]];
  if (data.discountEnabled && data.discountPercentage > 0) {
    totals.push([`Discount (${data.discountPercentage}%)`, `-${money(discountAmount)}`]);
    if (data.discountReason) totals.push([{ content: `Reason: ${data.discountReason}`, colSpan: 2, styles: { fontSize: 8, textColor: PDF_BRAND.muted } }]);
  }
  totals.push([
    { content: 'TOTAL', styles: { fillColor: PDF_BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 } },
    { content: money(finalTotal), styles: { fillColor: PDF_BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 } },
  ]);
  brandTable(doc, {
    startY: nextY(), theme: 'plain', body: totals,
    margin: { left: 105, right: 18, top: 36, bottom: 26 },
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: 3, textColor: PDF_BRAND.ink },
    columnStyles: { 0: { cellWidth: 45 }, 1: { halign: 'right' } },
  });

  const methods = [];
  if (data.paymentMethods.bankTransferItaly) methods.push(['Bank transfer (Italy)',
    `${BANK_DETAILS_IT.accountHolder}\nCodice Fiscale: ${BANK_DETAILS_IT.codiceFiscale}\nIBAN: ${BANK_DETAILS_IT.iban}\nBIC: ${BANK_DETAILS_IT.bic}\nBank: ${BANK_DETAILS_IT.bank}`]);
  if (data.paymentMethods.bankTransferTunisia) methods.push(['Bank transfer (Tunisia)',
    `Banque: ${BANK_DETAILS_TN.bank}\nType de compte: ${BANK_DETAILS_TN.accountType}\nBénéficiaire: ${BANK_DETAILS_TN.beneficiary}\nAdresse: ${BANK_DETAILS_TN.address}\nRIB: ${BANK_DETAILS_TN.rib}\nIBAN: ${BANK_DETAILS_TN.iban}\nCode SWIFT / BIC: ${BANK_DETAILS_TN.swiftBic}`]);
  if (data.paymentMethods.other) methods.push(['Other payment methods', 'Please contact our team.']);
  if (methods.length) brandTable(doc, {
    startY: nextY(), head: [[{ content: 'PAYMENT METHODS', colSpan: 2 }]], body: methods,
    columnStyles: { 0: { cellWidth: 53, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    rowPageBreak: 'avoid',
  });
  drawBrandFooter(doc);
  return doc;
}
