import { jsPDF } from 'jspdf';
import { prepareBrand, drawBrandHeader, drawBrandFooter, brandTable, PDF_BRAND, PDF_FONT } from '../pdfBrand.js';
import { formatDocDate } from '../financeDocs/constants.js';
import { DEGREE_LABELS, CITY_LABELS, FINANCING_PLAN_LABELS, YES_NO_LABELS, GUARANTOR_LABELS, toGpa } from './emailBody.js';

// Build separately from downloading so previews and layout checks use the same PDF.
export async function buildProposalItalyPdf(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brand = await prepareBrand(doc);
  let y = drawBrandHeader(doc, brand, { title: 'STUDY PROPOSAL', subtitle: 'ITALY  /  PERSONALIZED STUDY PLAN' });
  const section = (title, rows) => {
    // Keep the section heading with at least the start of its first record.
    doc.setFont(PDF_FONT, 'normal'); doc.setFontSize(8.5);
    const firstLines = doc.splitTextToSize(String(rows[0]?.[1] || '-'), 116).length;
    if (y + 18 + Math.min(firstLines, 8) * 4.2 > 270) { doc.addPage(); y = 36; }
    y = brandTable(doc, {
      startY: y,
      head: [[{ content: title, colSpan: 2 }]],
      body: rows.map(([label, value]) => [label, String(value || '-')]),
      styles: { font: PDF_FONT, fontSize: 8.5, cellPadding: 2.2, textColor: PDF_BRAND.ink },
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: PDF_BRAND.muted }, 1: { cellWidth: 'auto' } },
      rowPageBreak: 'avoid',
    }) + 7;
  };
  const list = value => value?.length ? value.join(', ') : '-';
  const label = (map, value) => map[value] || value || '-';
  section('01  /  PROPOSAL INFORMATION', [
    ['Proposal date', formatDocDate(data.proposalDate)], ['Valid until', formatDocDate(data.validUntil)],
  ]);
  section('02  /  STUDENT INFORMATION', [
    ['Full name', data.studentName], ['Email', data.email], ['Phone', data.phone], ['Nationality', data.nationality],
  ]);
  const profile = data.studentProfile || {};
  section('03  /  STUDENT PROFILE', [
    ['Current status', profile.currentStatus], ['Academic level', profile.academicLevel],
    ['Obtained diploma', list(profile.obtainedDiploma)], ['Year of graduation', profile.yearOfGraduation],
    ['Field of previous studies', profile.fieldOfPreviousStudies], ['Current occupation', profile.currentOccupation],
    ['Languages', list(profile.languages)], ['Note', profile.note],
  ]);
  if (profile.academicRecords?.length) section('03B  /  ACADEMIC RECORDS', profile.academicRecords.map((record, index) => [
    `Record ${index + 1}`,
    `Diploma: ${record.diploma || '-'}\nScore: ${record.score || '-'} / ${record.maxScore || '-'}\nGPA: ${toGpa(record.score, record.maxScore) || '-'}`,
  ]));
  if (profile.languageRecords?.length) section('03C  /  LANGUAGE DETAILS', profile.languageRecords.map((record, index) => [
    `Language ${index + 1}`, `Language: ${record.language || '-'}\nLevel: ${record.level || '-'}\nCertificate: ${record.certificate || '-'}`,
  ]));
  const prefs = data.studyPreferences || {};
  section('04  /  STUDY PREFERENCES', [
    ['Target degree level', label(DEGREE_LABELS, prefs.targetDegreeLevel)], ['Intended intake', prefs.intendedIntake],
    ['Field of study (primary)', prefs.fieldOfStudyPrimary], ['Alternative field', prefs.alternativeField],
    ['Program language', list(prefs.programLanguages)], ['Financing plan', label(FINANCING_PLAN_LABELS, prefs.financingPlan)],
    ['Blocked account', label(YES_NO_LABELS, prefs.blockedAccount)], ['Support from abroad', label(YES_NO_LABELS, prefs.hasAbroadSupport)],
    ['Abroad support details', prefs.abroadSupportDetails], ['Financial guarantor', label(GUARANTOR_LABELS, prefs.financialGuarantor)],
    ['Available budget', prefs.projectBudget], ['City preference', label(CITY_LABELS, prefs.cityPreferenceType)],
    ['Preferred city / university', prefs.preferredCityUniversity],
  ]);
  section('05  /  SERVICES', [ ['Services selected', list(data.services?.selected)], ['Note', data.services?.note] ]);
  drawBrandFooter(doc);
  return doc;
}

export async function generateProposalItalyPDF(data) {
  const doc = await buildProposalItalyPdf(data);
  const safeStudentName = String(data.studentName || '').trim().replace(/[^a-zA-Z0-9]/g, '_');
  const filename = safeStudentName
    ? `Proposal_${safeStudentName}_${new Date().toISOString().split('T')[0]}.pdf`
    : `Proposal_draft_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
