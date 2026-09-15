const DEGREE_LABELS = {
  bachelor: 'Bachelor',
  master: 'Master',
  researcher: 'Searcher',
  phd: 'PHD',
  'formation-prof': 'Formation Prof',
};

const CITY_LABELS = {
  large_international: 'Large international city',
  student_city: 'Student city',
  affordable_south: 'Affordable southern region',
  no_preference: 'No preference (best admission chance)',
};

const FINANCING_PLAN_LABELS = {
  'scholarship-only': 'Fully dependent on scholarship',
  'scholarship-plus-personal': 'Scholarship + personal funds',
  'personal-family-only': 'Personal / family funds only',
  'not-sure-yet': 'Not sure yet',
};

const YES_NO_LABELS = { yes: 'Yes', no: 'No' };

const GUARANTOR_LABELS = { self: 'Self', parent: 'Parent', relative: 'Relative', sponsor: 'Sponsor' };

const APP_FEES_PREF_LABELS = {
  separate: 'I can pay application fees separately',
  'include-in-service': 'I prefer to include them in the service',
};

function row(label, value) {
  if (!value?.trim()) return '';
  return `
    <tr>
      <td style="padding:4px 12px 4px 0;vertical-align:top;font-size:14px;color:#374151;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;font-size:14px;color:#111;">${escapeHtml(value)}</td>
    </tr>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sectionTitle(title) {
  return `<p style="margin:20px 0 8px;font-size:14px;font-weight:700;color:#111;">${escapeHtml(title)}</p>`;
}

function toGpa(score, maxScore) {
  const s = Number(score);
  const m = Number(maxScore);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return '';
  return (Math.round((s / m) * 4 * 100) / 100).toFixed(2);
}

export function buildProposalEmailBody(data) {
  const sp = data.studentProfile;
  const prefs = data.studyPreferences;

  const studentInfoRows = [
    row('Full name', data.studentName),
    row('Email', data.email),
    row('Phone', data.phone),
    row('Nationality', data.nationality),
  ].filter(Boolean);

  const profileRows = [
    row('Current status', sp.currentStatus),
    row('Academic level', sp.academicLevel),
    row('Obtained diploma', sp.obtainedDiploma?.length ? sp.obtainedDiploma.join(', ') : ''),
    row('Field of previous studies', sp.fieldOfPreviousStudies),
    row('Year of graduation', sp.yearOfGraduation),
    row('Current occupation', sp.currentOccupation),
    row('Languages', sp.languages?.length ? sp.languages.join(', ') : ''),
    row('Note', sp.note),
  ].filter(Boolean);

  const degreeLabel = prefs.targetDegreeLevel
    ? DEGREE_LABELS[prefs.targetDegreeLevel] || prefs.targetDegreeLevel
    : '';
  const svc = data.services;
  const servicesRows = [
    row('Services', svc?.selected?.length ? svc.selected.join(', ') : ''),
    row('Note', svc?.note || ''),
  ].filter(Boolean);

  const prefsRows = [
    ...(degreeLabel ? [row('Target degree level', degreeLabel)] : []),
    row('Intended intake', prefs.intendedIntake),
    row('Field of study (primary)', prefs.fieldOfStudyPrimary),
    row('Alternative field', prefs.alternativeField),
    row('Program language', prefs.programLanguages?.length ? prefs.programLanguages.join(', ') : ''),
    row('How do you plan to finance your studies?', prefs.financingPlan ? (FINANCING_PLAN_LABELS[prefs.financingPlan] || prefs.financingPlan) : ''),
    row('Blocked account available', prefs.blockedAccount ? (YES_NO_LABELS[prefs.blockedAccount] || prefs.blockedAccount) : ''),
    row('Financial support from abroad', prefs.hasAbroadSupport ? (YES_NO_LABELS[prefs.hasAbroadSupport] || prefs.hasAbroadSupport) : ''),
    row('Abroad support details', prefs.abroadSupportDetails),
    row('Financial guarantor', prefs.financialGuarantor ? (GUARANTOR_LABELS[prefs.financialGuarantor] || prefs.financialGuarantor) : ''),
    row('Application fees preference', prefs.applicationFeesPreference ? (APP_FEES_PREF_LABELS[prefs.applicationFeesPreference] || prefs.applicationFeesPreference) : ''),
    row('Available budget', prefs.projectBudget),
    row('City preference', prefs.cityPreferenceType ? (CITY_LABELS[prefs.cityPreferenceType] || prefs.cityPreferenceType) : ''),
    row('Preferred city / university', prefs.preferredCityUniversity),
  ].filter(Boolean);

  const tableStyle = 'width:100%;border-collapse:collapse;font-family:Arial,sans-serif;';
  const table = (rows) => (rows.length ? `<table style="${tableStyle}">${rows.join('')}</table>` : '');

  const academicRecordsRows = (sp.academicRecords || [])
    .map((record, idx) => {
      const gpa = toGpa(record.score, record.maxScore);
      return row(
        `Academic record ${idx + 1}`,
        [
          record.diploma ? `Diploma: ${record.diploma}` : '',
          record.score ? `Score: ${record.score}` : '',
          record.maxScore ? `Max Score: ${record.maxScore}` : '',
          gpa ? `GPA: ${gpa}` : '',
        ]
          .filter(Boolean)
          .join(' | ')
      );
    })
    .filter(Boolean);
  const languageRows = (sp.languageRecords || [])
    .map((record, idx) =>
      row(
        `Language ${idx + 1}`,
        [
          record.language ? `Language: ${record.language}` : '',
          record.level ? `Level: ${record.level}` : '',
          record.certificate ? `Certificate: ${record.certificate}` : '',
        ]
          .filter(Boolean)
          .join(' | ')
      )
    )
    .filter(Boolean);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">
  <p style="margin:0 0 16px;">
    Dear ${escapeHtml(data.studentName || 'Student')},
  </p>
  <p style="margin:0 0 16px;">
    Please find below your study proposal details.
  </p>

  ${studentInfoRows.length ? sectionTitle('Student information') + table(studentInfoRows) : ''}
  ${profileRows.length ? sectionTitle('Student profile') + table(profileRows) : ''}
  ${academicRecordsRows.length ? sectionTitle('Academic records') + table(academicRecordsRows) : ''}
  ${languageRows.length ? sectionTitle('Languages details') + table(languageRows) : ''}
  ${prefsRows.length ? sectionTitle('Study preferences') + table(prefsRows) : ''}
  ${servicesRows.length ? sectionTitle('Services') + table(servicesRows) : ''}

  <p style="margin:24px 0 0;">
    Best regards,<br/>
    Jeexpert
  </p>
</body>
</html>`.trim();
}
