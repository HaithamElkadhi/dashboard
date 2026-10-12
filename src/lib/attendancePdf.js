import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const text = value => String(value || '').replace(/[\u202f\u00a0]/g, ' ');

export function createAttendancePdf({ className, date, roster, marks, draft = false }) {
  const doc = new jsPDF();
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR');
  doc.setFontSize(20);
  doc.setTextColor(23, 59, 101);
  doc.text('Fiche de présence', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(23, 45, 67);
  doc.text(text(`Classe : ${className}`), 14, 32, { maxWidth: 182 });
  const classLines = doc.splitTextToSize(text(`Classe : ${className}`), 182).length;
  const detailsY = 32 + classLines * 5;
  doc.text(`Date : ${dateLabel}`, 14, detailsY);
  doc.text(draft ? 'Brouillon : présences non enregistrées' : 'Présences enregistrées', 14, detailsY + 7);
  autoTable(doc, {
    startY: detailsY + 13,
    head: [['N°', 'Nom de l’élève', 'Présence', 'Signature / observations']],
    body: roster.map((student, index) => [String(index + 1), text(student.fields?.['Nom complet'] || 'Élève'), marks[student.id] || 'À renseigner', '']),
    styles: { fontSize: 10, cellPadding: 3, minCellHeight: 12, overflow: 'linebreak' },
    headStyles: { fillColor: [23, 59, 101] },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 65 }, 2: { cellWidth: 30 } },
    margin: { bottom: 20 },
    rowPageBreak: 'avoid',
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(`Page ${page} / ${pages}`, 196, 287, { align: 'right' });
  }
  return doc;
}

export function attendancePdfFilename(className, date) {
  const slug = String(className || 'classe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80);
  return `fiche-presence-${slug}-${date}.pdf`;
}
