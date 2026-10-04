import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { visaNoteError } from './visaNoteText.js';

const NAVY = [24, 42, 65];
const GREEN = [30, 116, 91];
const GOLD = [190, 149, 69];
const TAGS = { translate: 'À traduire', x2: '2 exemplaires', master: 'Master', opt: 'Optionnel' };

// Standard PDF fonts support Latin accents; normalize typographic symbols and
// omit unsupported emoji rather than printing broken glyphs.
function text(value = '') {
  return String(value).normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014\u2011]/g, '-')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/€/g, 'EUR').replace(/…/g, '...')
    .replace(/ᵉ/g, 'e').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[^\x09\x0a\x0d\x20-\xff]/g, '');
}

function tagLabel(spec) {
  const separator = spec.indexOf(':');
  return separator < 0 ? (TAGS[spec] || spec) : spec.slice(separator + 1);
}

/** Build a document without browser side effects, so exports can be verified. */
export function buildVisaChecklistPdf(groups, checks = {}, preferences = {}, options = {}) {
  for (const group of groups) for (const item of group.items) {
    if (!preferences[item.id]?.hidden && visaNoteError(preferences[item.id]?.note)) throw new Error(visaNoteError(preferences[item.id]?.note));
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  const visible = groups.map(group => ({ ...group, items: group.items.filter(item => !preferences[item.id]?.hidden) }))
    .filter(group => group.items.length);
  const items = visible.flatMap(group => group.items);
  const completed = items.filter(item => checks[item.id]).length;
  doc.setProperties({ title: 'Dossier visa études Italie - Checklist', author: 'Jeexpert' });
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 53, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(16, 13, 15, 1.3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('JEEXPERT / VISA ÉTUDES ITALIE', 16, 23);
  doc.setFontSize(23);
  doc.text('Votre dossier, pièce par pièce', 16, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Checklist personnalisée et notes de préparation', 16, 44);
  doc.setTextColor(...GREEN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${completed} / ${items.length} documents prêts`, 16, 64);
  doc.setTextColor(100, 110, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(text(options.dateLabel || new Date().toLocaleDateString('fr-FR', { timeZone: 'Africa/Tunis' })), 194, 64, { align: 'right' });
  doc.setDrawColor(224, 231, 237);
  doc.line(16, 69, 194, 69);
  let y = 77;

  for (const [index, group] of visible.entries()) {
    if (y > 246) { doc.addPage(); y = 29; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(`${String(index + 1).padStart(2, '0')}  ${text(group.title)}`, 16, y);
    const rows = group.items.map(item => {
      const details = [item.title, item.note && `Précision : ${item.note}`, item.sub,
        item.tags?.length && `Repères : ${item.tags.map(tagLabel).join(' / ')}`,
        preferences[item.id]?.note?.trim() && `Votre note : ${preferences[item.id].note.trim()}`]
        .filter(Boolean).map(text).join('\n\n');
      return [checks[item.id] ? 'Prêt' : 'À préparer', details];
    });
    autoTable(doc, {
      startY: y + 5, margin: { left: 16, right: 16, top: 29, bottom: 22 },
      head: [['STATUT', 'DOCUMENT ET NOTES']], body: rows,
      theme: 'plain', showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak', textColor: NAVY, lineColor: [228, 234, 238], lineWidth: { bottom: 0.25 } },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 250] },
      columnStyles: { 0: { cellWidth: 27, fontSize: 8, fontStyle: 'bold' }, 1: { cellWidth: 151 } },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.textColor = data.cell.raw === 'Prêt' ? GREEN : [130, 99, 40];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 12;
  }
  if (!items.length) {
    doc.setTextColor(...NAVY);
    doc.setFontSize(11);
    doc.text('Aucun document sélectionné pour cet export.', 16, 80);
  }
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text('JEEXPERT / DOSSIER VISA ÉTUDES ITALIE', 16, 16);
      doc.setDrawColor(...GOLD);
      doc.line(16, 21, 194, 21);
    }
    doc.setDrawColor(224, 231, 237);
    doc.line(16, 279, 194, 279);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 130);
    doc.text('Guide de préparation personnel - Vérifiez les exigences au dépôt.', 16, 285);
    doc.text(`${page} / ${pageCount}`, 194, 285, { align: 'right' });
  }
  return doc;
}

export function downloadVisaChecklistPdf(groups, checks, preferences, options = {}) {
  const doc = buildVisaChecklistPdf(groups, checks, preferences, options);
  doc.save(options.filename || 'Jeexpert-checklist-visa-Italie.pdf');
  return doc;
}
