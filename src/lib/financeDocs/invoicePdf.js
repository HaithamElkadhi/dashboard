// Invoice PDF — ported from v0-invoice-generator-spec lib/pdf-generator.ts.
// Returns the jsPDF doc instead of saving it, so the caller can preview,
// download or attach it to an email.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  COMPANY_INFO,
  BANK_DETAILS_IT,
  BANK_DETAILS_TN,
  BRAND_COLORS,
  buildDocFilename,
  computeInvoiceTotals,
  formatDocDate,
  formatInvoiceCurrency,
} from './constants.js';

let logoDataUrlPromise = null;

// Loaded once and reused: the preview regenerates the PDF on every edit.
function loadLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeout = setTimeout(() => resolve(null), 2000);
      img.onload = () => {
        clearTimeout(timeout);
        try {
          // Printed at 15mm, so ~240px is plenty; the full-size PNG would add
          // ~700 KB to every PDF (and email attachment).
          const scale = Math.min(1, 240 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      img.src = COMPANY_INFO.logoUrl;
    });
  }
  return logoDataUrlPromise;
}

export function invoiceFilename(data) {
  return buildDocFilename('Invoice', {
    clientName: data.clientName,
    reference: data.invoiceNumber || 'DRAFT',
    date: data.date,
  });
}

export async function buildInvoicePdf(data) {
  const { subtotal, discountAmount, finalTotal } = computeInvoiceTotals(data);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const { primary, accent } = BRAND_COLORS;

  let yPos = margin;

  const logo = await loadLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', margin, yPos, 15, 15, 'logo', 'FAST');
    } catch {
      // Logo failed, continue without it
    }
  }
  const textX = margin + (logo ? 20 : 0);

  // Company info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(COMPANY_INFO.name, textX, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY_INFO.email, textX, yPos + 10);
  doc.text(COMPANY_INFO.phone, textX, yPos + 14);
  doc.text(COMPANY_INFO.website, textX, yPos + 18);

  // INVOICE title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('INVOICE', pageWidth - margin, yPos + 5, { align: 'right' });

  // Invoice details box
  yPos += 25;
  const boxWidth = 60;
  const boxX = pageWidth - margin - boxWidth;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, yPos, boxWidth, 25, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  const detailsX = boxX + 5;
  doc.text('Invoice No:', detailsX, yPos + 7);
  doc.text('Date:', detailsX, yPos + 14);
  doc.text('Due Date:', detailsX, yPos + 21);

  doc.setTextColor(40, 40, 40);
  doc.text(data.invoiceNumber || 'DRAFT', detailsX + 25, yPos + 7);
  doc.text(formatDocDate(data.date), detailsX + 25, yPos + 14);
  doc.text(data.dueDate ? formatDocDate(data.dueDate) : '-', detailsX + 25, yPos + 21);

  // Client information
  yPos += 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('BILL TO', margin, yPos);

  yPos += 6;
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(data.clientName || '', margin, yPos);

  if (data.clientAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    data.clientAddress.split('\n').forEach((line) => {
      yPos += 5;
      doc.text(line, margin, yPos);
    });
  }

  // Items table
  yPos += 15;

  const tableData = data.items
    .filter((item) => item.description.trim())
    .map((item) => [
      item.description,
      String(item.quantity),
      formatInvoiceCurrency(Number(item.unitPrice) || 0, data.currency),
      formatInvoiceCurrency(
        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        data.currency
      ),
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'QTY', 'Unit Price', 'Total']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [primary.r, primary.g, primary.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Totals section
  const totalsX = pageWidth - margin - 60;
  const totalsValueX = pageWidth - margin;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', totalsX, yPos);
  doc.setTextColor(40, 40, 40);
  doc.text(formatInvoiceCurrency(subtotal, data.currency), totalsValueX, yPos, { align: 'right' });

  if (data.discountEnabled && data.discountPercentage > 0) {
    yPos += 7;
    doc.setTextColor(100, 100, 100);
    doc.text(`Discount (${data.discountPercentage}%)`, totalsX, yPos);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(`-${formatInvoiceCurrency(discountAmount, data.currency)}`, totalsValueX, yPos, {
      align: 'right',
    });

    if (data.discountReason) {
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Reason: ${data.discountReason}`, totalsX, yPos);
    }
  }

  // Final total
  yPos += 10;
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.roundedRect(totalsX - 5, yPos - 5, 70, 12, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalsX, yPos + 3);
  doc.text(formatInvoiceCurrency(finalTotal, data.currency), totalsValueX, yPos + 3, {
    align: 'right',
  });

  // Payment methods
  yPos += 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('PAYMENT METHODS', margin, yPos);

  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const line = (text, step) => {
    doc.text(text, margin + 3, yPos);
    yPos += step;
  };

  if (data.paymentMethods.bankTransferItaly) {
    line('• Bank transfer (Italy):', 5);
    line(`    ${BANK_DETAILS_IT.accountHolder}`, 4);
    line(`    Codice Fiscale: ${BANK_DETAILS_IT.codiceFiscale}`, 4);
    line(`    IBAN: ${BANK_DETAILS_IT.iban}`, 4);
    line(`    BIC: ${BANK_DETAILS_IT.bic}`, 4);
    line(`    Bank: ${BANK_DETAILS_IT.bank}`, 5);
  }

  if (data.paymentMethods.bankTransferTunisia) {
    line('• Bank transfer (Tunisia):', 5);
    line(`    Banque: ${BANK_DETAILS_TN.bank}`, 4);
    line(`    Type de compte: ${BANK_DETAILS_TN.accountType}`, 4);
    line(`    Bénéficiaire: ${BANK_DETAILS_TN.beneficiary}`, 4);
    line(`    Adresse: ${BANK_DETAILS_TN.address}`, 4);
    line(`    RIB: ${BANK_DETAILS_TN.rib}`, 4);
    line(`    IBAN: ${BANK_DETAILS_TN.iban}`, 4);
    line(`    Code SWIFT / BIC: ${BANK_DETAILS_TN.swiftBic}`, 5);
  }

  if (data.paymentMethods.other) {
    line('• Other payment methods', 5);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('Thank you for your trust.', pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Your Academic Journey Abroad Starts Here', pageWidth / 2, footerY + 6, {
    align: 'center',
  });

  return doc;
}
