// HTML email bodies for the Facture & Reçu emails — ported from
// v0-invoice-generator-spec (lib/invoice-email-body.ts and
// lib/payment-receipt-email-body.ts). The PDF itself is sent as attachment.
import {
  COMPANY_INFO,
  BANK_DETAILS_IT,
  BANK_DETAILS_TN,
  PAYMENT_METHOD_LABELS,
  computeInvoiceTotals,
  escapeHtml,
  formatDocDate,
  formatInvoiceCurrency,
} from './constants.js';

export function buildInvoiceEmailBody(data) {
  const { subtotal, discountAmount, finalTotal } = computeInvoiceTotals(data);
  const fmt = (n) => formatInvoiceCurrency(n, data.currency);

  const paymentLabels = [];
  if (data.paymentMethods.bankTransferItaly) {
    paymentLabels.push(
      `Bank transfer (Italy) — ${BANK_DETAILS_IT.bank}, IBAN: ${BANK_DETAILS_IT.iban}, BIC: ${BANK_DETAILS_IT.bic}, Account: ${BANK_DETAILS_IT.accountHolder}, Codice Fiscale: ${BANK_DETAILS_IT.codiceFiscale}`
    );
  }
  if (data.paymentMethods.bankTransferTunisia) {
    paymentLabels.push(
      `Bank transfer (Tunisia) — Banque: ${BANK_DETAILS_TN.bank}; Type de compte: ${BANK_DETAILS_TN.accountType}; Bénéficiaire: ${BANK_DETAILS_TN.beneficiary}; Adresse: ${BANK_DETAILS_TN.address}; RIB: ${BANK_DETAILS_TN.rib}; IBAN: ${BANK_DETAILS_TN.iban}; SWIFT/BIC: ${BANK_DETAILS_TN.swiftBic}`
    );
  }
  if (data.paymentMethods.other) paymentLabels.push('Other (see details)');

  const itemsRows = data.items
    .filter((item) => item.description?.trim())
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;vertical-align:top;font-size:14px;color:#111;">${escapeHtml(item.description)}</td>
          <td style="padding:6px 8px;text-align:center;font-size:14px;">${item.quantity}</td>
          <td style="padding:6px 8px;text-align:right;font-size:14px;">${fmt(Number(item.unitPrice) || 0)}</td>
          <td style="padding:6px 0 6px 8px;text-align:right;font-size:14px;">${fmt((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</td>
        </tr>`
    )
    .join('');

  const thStyle =
    'padding:8px 12px 8px 0;text-align:left;font-size:12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;';
  const thRight =
    'padding:8px 8px;text-align:right;font-size:12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;';

  const itemsTable =
    itemsRows &&
    `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;margin:8px 0;">
  <thead><tr>
    <th style="${thStyle}">Description</th>
    <th style="${thRight}">Qty</th>
    <th style="${thRight}">Unit price</th>
    <th style="${thRight}">Amount</th>
  </tr></thead>
  <tbody>${itemsRows}</tbody>
</table>`;

  const discountSection =
    data.discountEnabled && data.discountPercentage > 0
      ? `<p style="margin:12px 0 4px;font-size:14px;"><strong>Discount:</strong> ${data.discountPercentage}%${data.discountReason?.trim() ? ` – ${escapeHtml(data.discountReason)}` : ''}</p>
  <p style="margin:0 0 12px;font-size:14px;">Discount amount: ${fmt(discountAmount)}</p>`
      : '';

  const paymentSection =
    paymentLabels.length > 0
      ? `<p style="margin:12px 0 4px;font-size:14px;"><strong>Payment methods</strong></p>
  <ul style="margin:0 0 12px;padding-left:20px;font-size:14px;">${paymentLabels.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
      : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">
  <p style="margin:0 0 16px;">
    Dear ${escapeHtml(data.clientName || 'Client')},
  </p>
  <p style="margin:0 0 16px;">
    Please find below the details of your invoice from ${escapeHtml(COMPANY_INFO.name)}. The invoice is also attached to this email as a PDF.
  </p>

  <p style="margin:16px 0 4px;font-size:14px;"><strong>Invoice number:</strong> ${escapeHtml(data.invoiceNumber || '—')}</p>
  <p style="margin:0 0 4px;font-size:14px;"><strong>Date:</strong> ${formatDocDate(data.date)}</p>
  <p style="margin:0 0 12px;font-size:14px;"><strong>Due date:</strong> ${formatDocDate(data.dueDate) || '—'}</p>

  <p style="margin:12px 0 4px;font-size:14px;"><strong>Bill to</strong></p>
  <p style="margin:0 0 4px;font-size:14px;">${escapeHtml(data.clientName)}</p>
  ${data.clientAddress?.trim() ? `<p style="margin:0 0 12px;font-size:14px;white-space:pre-line;">${escapeHtml(data.clientAddress)}</p>` : ''}

  <p style="margin:16px 0 4px;font-size:14px;"><strong>Items</strong></p>
  ${itemsTable || "<p style='margin:0 0 12px;font-size:14px;'>No items.</p>"}
  ${discountSection}

  <p style="margin:12px 0 4px;font-size:14px;"><strong>Subtotal:</strong> ${fmt(subtotal)}</p>
  ${data.discountEnabled && discountAmount > 0 ? `<p style="margin:0 0 4px;font-size:14px;"><strong>Discount:</strong> ${fmt(discountAmount)}</p>` : ''}
  <p style="margin:8px 0 12px;font-size:15px;font-weight:700;"><strong>Total:</strong> ${fmt(finalTotal)}</p>

  ${paymentSection}

  <p style="margin:24px 0 0;">
    If you have any questions, please contact us at ${escapeHtml(COMPANY_INFO.email)} or ${escapeHtml(COMPANY_INFO.phone)}.
  </p>
  <p style="margin:16px 0 0;">
    Best regards,<br/>
    ${escapeHtml(COMPANY_INFO.name)}
  </p>
</body>
</html>`.trim();
}

export function buildReceiptEmailBody(data) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">
  <p style="margin:0 0 16px;">Dear ${escapeHtml(data.clientName || 'Client')},</p>

  <p style="margin:0 0 16px;">
    Please find attached your payment receipt from ${escapeHtml(COMPANY_INFO.name)}.
  </p>

  <p style="margin:14px 0 4px;"><strong>Reference:</strong> ${escapeHtml(data.invoiceId || '—')}</p>
  <p style="margin:0 0 4px;"><strong>Payment Date:</strong> ${escapeHtml(formatDocDate(data.paymentDate) || '—')}</p>
  <p style="margin:0 0 12px;"><strong>Purpose:</strong> ${escapeHtml(data.paymentReason || '—')}</p>

  <p style="margin:12px 0 4px;"><strong>Payment summary</strong></p>
  <ul style="margin:0 0 12px;padding-left:20px;">
    <li>Currency: ${escapeHtml(data.currency)}</li>
    <li>Amount: ${escapeHtml(formatInvoiceCurrency(Number(data.amount) || 0, data.currency))}</li>
  </ul>

  <p style="margin:12px 0 4px;"><strong>Payment Method:</strong> ${escapeHtml(PAYMENT_METHOD_LABELS[data.paymentMethod] ?? PAYMENT_METHOD_LABELS.other)}</p>

  ${
    data.comment.trim()
      ? `<p style="margin:12px 0 4px;"><strong>Comment</strong></p><p style="margin:0 0 12px;white-space:pre-line;">${escapeHtml(data.comment.trim())}</p>`
      : ''
  }

  <p style="margin:20px 0 0;">
    For any question, contact us at ${escapeHtml(COMPANY_INFO.email)} or ${escapeHtml(COMPANY_INFO.phone)}.
  </p>

  <p style="margin:16px 0 0;">
    Best regards,<br />
    ${escapeHtml(COMPANY_INFO.name)}
  </p>
</body>
</html>`.trim();
}
