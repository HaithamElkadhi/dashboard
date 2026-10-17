import { jsPDF } from 'jspdf';
import { prepareBrand, drawBrandHeader, drawBrandFooter, brandTable, PDF_BRAND, PDF_FONT } from '../pdfBrand.js';
import {
  CURRENCY_LABELS, buildDocFilename, PAYMENT_METHOD_LABELS, formatDocDate, formatInvoiceCurrency,
} from './constants.js';

export function receiptFilename(data) {
  return buildDocFilename('Receipt', {
    clientName: data.clientName, reference: data.invoiceId, date: data.paymentDate,
  });
}

export async function buildReceiptPdf(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brand = await prepareBrand(doc);
  const y = drawBrandHeader(doc, brand, { title: 'PAYMENT RECEIPT', subtitle: 'Thank you for your trust.' });
  const nextY = () => doc.lastAutoTable.finalY + 9;
  const currencyLabel = CURRENCY_LABELS[data.currency] ?? data.currency;

  brandTable(doc, {
    startY: y, theme: 'plain',
    body: [
      ['Reference', data.invoiceId || '-'],
      ['Payment Date', formatDocDate(data.paymentDate) || '-'],
      ['Purpose', data.paymentReason || '-'],
    ],
    styles: { font: PDF_FONT, fontSize: 9.5, cellPadding: 3.5, fillColor: PDF_BRAND.light, textColor: PDF_BRAND.ink },
    columnStyles: { 0: { cellWidth: 43, fontStyle: 'bold', textColor: PDF_BRAND.navy } },
  });

  const clientRows = [['Name', data.clientName || '-']];
  if (data.clientEmail) clientRows.push(['Email', data.clientEmail]);
  if (data.clientPhone) clientRows.push(['Phone', data.clientPhone]);
  if (data.clientAddress) clientRows.push(['Address', data.clientAddress]);
  brandTable(doc, {
    startY: nextY(), head: [[{ content: 'CLIENT DETAILS', colSpan: 2 }]], body: clientRows,
    columnStyles: { 0: { cellWidth: 43, fontStyle: 'bold' } },
  });

  brandTable(doc, {
    startY: nextY(), theme: 'plain',
    body: [
      [
        { content: `AMOUNT (${currencyLabel})`, styles: { fontStyle: 'bold', fontSize: 10 } },
        { content: formatInvoiceCurrency(Number(data.amount) || 0, data.currency), styles: { fontStyle: 'bold', fontSize: 16, halign: 'right' } },
      ],
      [{ content: `Payment Method: ${PAYMENT_METHOD_LABELS[data.paymentMethod] ?? PAYMENT_METHOD_LABELS.other}`, colSpan: 2, styles: { fontSize: 9 } }],
    ],
    styles: { font: PDF_FONT, cellPadding: 5, fillColor: PDF_BRAND.navy, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: PDF_BRAND.navy },
    columnStyles: { 0: { cellWidth: 100 } },
    pageBreak: 'avoid',
  });

  if (data.comment?.trim()) brandTable(doc, {
    startY: nextY(), head: [['COMMENT']], body: [[data.comment.trim()]],
  });
  drawBrandFooter(doc);
  return doc;
}
