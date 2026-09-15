import jsPDF from 'jspdf';

export async function generateProposalItalyPDF(data) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const brandColor = [41, 84, 144];
  const grayColor = [100, 100, 100];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };
  const toGpa = (score, maxScore) => {
    const s = Number(score);
    const m = Number(maxScore);
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return '-';
    return (Math.round((s / m) * 4 * 100) / 100).toFixed(2);
  };

  const checkPageBreak = (requiredSpace) => {
    if (y + requiredSpace > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
  };

  const drawHeader = () => {
    doc.setFillColor(...brandColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('JEEXPERT', margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Your Academic Journey Abroad Starts Here', margin, 26);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDY PROPOSAL - ITALY', pageWidth - margin, 22, { align: 'right' });
    y = 45;
  };

  const drawSectionTitle = (title) => {
    checkPageBreak(15);
    doc.setFillColor(...brandColor);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, y + 5.5);
    y += 12;
    doc.setTextColor(0, 0, 0);
  };

  const drawField = (label, value, xOffset = 0, width = contentWidth / 2 - 5) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text(label, margin + xOffset, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(value || '-', width);
    doc.text(lines, margin + xOffset, y + 4);
    return 4 + lines.length * 4;
  };

  drawHeader();

  drawSectionTitle('1. PROPOSAL INFORMATION');
  const row1Height = Math.max(
    drawField('Proposal Date', formatDate(data.proposalDate), 0),
    drawField('Valid Until', formatDate(data.validUntil), contentWidth / 2)
  );
  y += row1Height + 4;

  drawSectionTitle('2. STUDENT INFORMATION');
  const s1 = Math.max(
    drawField('Full Name', data.studentName, 0),
    drawField('Email', data.email, contentWidth / 2)
  );
  y += s1 + 2;
  const s2 = Math.max(
    drawField('Phone', data.phone, 0),
    drawField('Nationality', data.nationality, contentWidth / 2)
  );
  y += s2 + 4;

  drawSectionTitle('3. STUDENT PROFILE');
  const spro = data.studentProfile;
  const cp1 = Math.max(
    drawField('Current Status', spro.currentStatus || '-', 0),
    drawField('Academic Level', spro.academicLevel || '-', contentWidth / 2)
  );
  y += cp1 + 2;
  const cp2 = Math.max(
    drawField('Obtained Diploma', spro.obtainedDiploma?.length ? spro.obtainedDiploma.join(', ') : '-', 0),
    drawField('Year of Graduation', spro.yearOfGraduation || '-', contentWidth / 2)
  );
  y += cp2 + 2;
  const cp3 = drawField('Field of Previous Studies', spro.fieldOfPreviousStudies || '-', 0, contentWidth);
  y += cp3 + 2;
  const cp4 = Math.max(
    drawField('Current Occupation', spro.currentOccupation || '-', 0),
    drawField('Languages', spro.languages?.length ? spro.languages.join(', ') : '-', contentWidth / 2)
  );
  y += cp4 + 2;
  const cp5 = drawField('Note', spro.note || '-', 0, contentWidth);
  y += cp5 + 4;

  const academicRecords = spro.academicRecords || [];
  if (academicRecords.length > 0) {
    drawSectionTitle('3B. ACADEMIC RECORDS');
    academicRecords.forEach((record, index) => {
      const line = [
        `Diploma: ${record.diploma || '-'}`,
        `Score: ${record.score || '-'}`,
        `Max Score: ${record.maxScore || '-'}`,
        `GPA: ${toGpa(record.score, record.maxScore)}`,
      ].join(' | ');
      const recHeight = drawField(`Record ${index + 1}`, line, 0, contentWidth);
      y += recHeight + 2;
    });
    y += 2;
  }
  const languageRecords = spro.languageRecords || [];
  if (languageRecords.length > 0) {
    drawSectionTitle('3C. LANGUAGES DETAILS');
    languageRecords.forEach((record, index) => {
      const line = [
        `Language: ${record.language || '-'}`,
        `Level: ${record.level || '-'}`,
        `Certificate: ${record.certificate || '-'}`,
      ].join(' | ');
      const recHeight = drawField(`Language ${index + 1}`, line, 0, contentWidth);
      y += recHeight + 2;
    });
    y += 2;
  }

  drawSectionTitle('4. STUDY PREFERENCES');
  const sp = data.studyPreferences;
  const degreeLabels = {
    bachelor: 'Bachelor',
    master: 'Master',
    researcher: 'Searcher',
    phd: 'PHD',
    'formation-prof': 'Formation Prof',
  };
  const cityLabels = {
    large_international: 'Large international city',
    student_city: 'Student city',
    affordable_south: 'Affordable southern region',
    no_preference: 'No preference (best admission chance)',
  };
  const financingPlanLabels = {
    'scholarship-only': 'Fully dependent on scholarship',
    'scholarship-plus-personal': 'Scholarship + personal funds',
    'personal-family-only': 'Personal / family funds only',
    'not-sure-yet': 'Not sure yet',
  };
  const yesNoLabels = { yes: 'Yes', no: 'No' };
  const guarantorLabels = { self: 'Self', parent: 'Parent', relative: 'Relative', sponsor: 'Sponsor' };
  const appFeesPrefLabels = {
    separate: 'I can pay application fees separately',
    'include-in-service': 'I prefer to include them in the service',
  };

  const sp1 = Math.max(
    drawField('Target Degree Level', sp.targetDegreeLevel ? degreeLabels[sp.targetDegreeLevel] || sp.targetDegreeLevel : '-', 0),
    drawField('Intended Intake', sp.intendedIntake || '-', contentWidth / 2)
  );
  y += sp1 + 2;
  const sp2 = drawField('Field of Study (Primary)', sp.fieldOfStudyPrimary || '-', 0, contentWidth);
  y += sp2 + 2;
  const sp3 = drawField('Alternative Field', sp.alternativeField || '-', 0, contentWidth);
  y += sp3 + 2;
  const sp4 = drawField(
    'Program Language',
    sp.programLanguages?.length ? sp.programLanguages.join(', ') : '-',
    0,
    contentWidth
  );
  y += sp4 + 2;
  const sp5 = drawField(
    'Financing Plan',
    sp.financingPlan ? financingPlanLabels[sp.financingPlan] || sp.financingPlan : '-',
    0,
    contentWidth
  );
  y += sp5 + 2;
  const sp6 = Math.max(
    drawField('Blocked Account', sp.blockedAccount ? yesNoLabels[sp.blockedAccount] || sp.blockedAccount : '-', 0),
    drawField('Support From Abroad', sp.hasAbroadSupport ? yesNoLabels[sp.hasAbroadSupport] || sp.hasAbroadSupport : '-', contentWidth / 2)
  );
  y += sp6 + 2;
  const sp7 = drawField('Abroad Support Details', sp.abroadSupportDetails || '-', 0, contentWidth);
  y += sp7 + 2;
  const sp8 = Math.max(
    drawField('Financial Guarantor', sp.financialGuarantor ? guarantorLabels[sp.financialGuarantor] || sp.financialGuarantor : '-', 0),
    drawField('Application Fees Preference', sp.applicationFeesPreference ? appFeesPrefLabels[sp.applicationFeesPreference] || sp.applicationFeesPreference : '-', contentWidth / 2)
  );
  y += sp8 + 2;
  const sp9 = drawField('Available Budget', sp.projectBudget || '-', 0, contentWidth);
  y += sp9 + 2;
  const sp10 = drawField(
    'City Preference Type',
    sp.cityPreferenceType ? cityLabels[sp.cityPreferenceType] || sp.cityPreferenceType : '-',
    0,
    contentWidth
  );
  y += sp10 + 2;
  const sp11 = drawField('Preferred city / university', sp.preferredCityUniversity || '-', 0, contentWidth);
  y += sp11 + 4;

  drawSectionTitle('5. SERVICES');
  const svc = data.services;
  const svc1 = drawField('Services selected', svc?.selected?.length ? svc.selected.join(', ') : '-', 0, contentWidth);
  y += svc1 + 2;
  const svc2 = drawField('Note', svc?.note?.trim() || '-', 0, contentWidth);
  y += svc2 + 4;

  const drawFooter = () => {
    doc.setFillColor(...brandColor);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Your Academic Journey Abroad Starts Here', pageWidth / 2, pageHeight - 5, { align: 'center' });
  };

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter();
  }

  const safeStudentName = data.studentName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  const filename = safeStudentName
    ? `Proposal_${safeStudentName}_${new Date().toISOString().split('T')[0]}.pdf`
    : `Proposal_draft_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(filename);
}
