import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from './format.js';
import { computeMoezAmount } from './airtable.js';

export const MOEZ_INVOICE_SCOPES = [
  { key: 'all', label: 'Toutes' },
  { key: 'suspended', label: 'Suspendues' },
  { key: 'active', label: 'Actives' },
];

const SCOPE_TITLES = {
  all: 'Toutes les commissions Moez',
  suspended: 'Commissions Moez suspendues',
  active: 'Commissions Moez actives',
};

const TAX_NOTE =
  "La colonne « Taxe » correspond aux frais bancaires/de transfert " +
  "prélevés sur le montant brut du paiement, avant calcul du Net à " +
  "recevoir. La commission Moez est calculée sur ce Net (montant brut moins " +
  "la taxe et moins la commission commerciale) — pas sur le montant brut " +
  "encaissé auprès de l'étudiant. C'est pourquoi, par exemple, un taux de " +
  "20% ne correspond pas à 20% du brut, mais 20% de ce qu'il reste après ces " +
  "déductions.";

const CURRENCY_LABELS = {
  TND: 'TND',
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP',
};

/** jsPDF Helvetica mishandles fr-FR narrow/no-break spaces — normalize for PDF. */
function pdfMoney(n, currency) {
  return formatMoney(n, currency)
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .trim();
}

function rowsForScope(paiements, scope) {
  const withMoez = paiements.filter((p) => p.moezType && p.moezType !== 'Aucune');
  if (scope === 'suspended') return withMoez.filter((p) => !p.soldeConfirme);
  if (scope === 'active') return withMoez.filter((p) => p.soldeConfirme);
  return withMoez;
}

function drawTotalsBlock(doc, rows, startY) {
  const totals = {};
  for (const p of rows) {
    const cur = p.currency || 'EUR';
    totals[cur] = (totals[cur] || 0) + computeMoezAmount(p);
  }
  const entries = Object.entries(totals);
  if (entries.length === 0) entries.push(['EUR', 0]);

  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 14;
  const right = pageWidth - 14;
  const boxWidth = right - left;
  const lineH = 7;
  const padY = 6;
  const headerH = 8;
  const boxH = padY + headerH + entries.length * lineH + padY;

  let y = startY + 8;
  if (y + boxH > doc.internal.pageSize.getHeight() - 14) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(220);
  doc.setFillColor(248, 248, 246);
  doc.roundedRect(left, y, boxWidth, boxH, 2, 2, 'FD');

  const countLabel = `${rows.length} paiement${rows.length > 1 ? 's' : ''}`;
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.setFont(undefined, 'bold');
  doc.text('Total commission Moez', left + 6, y + padY + 4);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(countLabel, right - 6, y + padY + 4, { align: 'right' });

  let rowY = y + padY + headerH + 2;
  doc.setDrawColor(230);
  doc.line(left + 6, rowY, right - 6, rowY);
  rowY += 5;

  for (const [cur, val] of entries) {
    const label = CURRENCY_LABELS[cur] || cur;
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.setFont(undefined, 'normal');
    doc.text(label, left + 6, rowY);

    doc.setFont(undefined, 'bold');
    doc.setTextColor(20);
    doc.text(pdfMoney(val, cur), right - 6, rowY, { align: 'right' });
    rowY += lineH;
  }
}

export function generateMoezInvoice(paiements, scope) {
  const rows = rowsForScope(paiements, scope);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Facture — Commission Moez', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(SCOPE_TITLES[scope] || SCOPE_TITLES.all, 14, 25);
  doc.text(`Générée le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

  doc.setFontSize(8.5);
  const noteLines = doc.splitTextToSize(TAX_NOTE, 182);
  doc.text(noteLines, 14, 38);

  const tableStartY = 38 + noteLines.length * 3.8 + 6;

  const body = rows.map((p) => [
    p.reference || '—',
    p.fullName || '—',
    (p.purpose || []).join(', ') || '—',
    pdfMoney(p.amount, p.currency),
    `${p.taxe || 0}%`,
    pdfMoney(p.netARecevoir, p.currency),
    p.moezType || '—',
    pdfMoney(computeMoezAmount(p), p.currency),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [
      [
        'Réf',
        'Étudiant',
        'Purpose (service)',
        'Brut',
        'Taxe',
        'Net',
        'Type',
        'Commission Moez',
      ],
    ],
    body,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: { 2: { cellWidth: 32 } },
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : tableStartY;
  drawTotalsBlock(doc, rows, finalY);

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`commission-moez-${scope}-${dateStamp}.pdf`);
}
