import { GraduationCapIcon } from '../../icons.jsx';
import { Card, CardHeader, FieldLabel, PillButton, Select, SectionTitle, TextInput } from './shared.jsx';

const CURRENT_STATUS_OPTIONS = [
  { value: 'Student', label: 'Student' },
  { value: 'Employed', label: 'Employed' },
  { value: 'Unemployed', label: 'Unemployed' },
  { value: 'Freelancer', label: 'Freelancer' },
];

const OBTAINED_DIPLOMA_OPTIONS = [
  { value: 'Bac', label: 'Bac' },
  { value: 'BTS', label: 'BTS' },
  { value: 'BTP', label: 'BTP' },
  { value: 'Licence', label: 'Licence' },
  { value: 'Master', label: 'Master' },
  { value: 'Engineering Degree', label: 'Engineering' },
  { value: 'PhD', label: 'PhD' },
];

const ACADEMIC_LEVEL_OPTIONS = [
  { value: 'Pre Bac', label: 'Pre Bac' },
  { value: 'Bac (en cours)', label: 'Bac (en cours)' },
  { value: 'Bac accompli', label: 'Bac accompli' },
  { value: 'Bac +1', label: 'Bac +1' },
  { value: 'Bac +2 (BTS / BTP / DUT / équivalent)', label: 'Bac +2 (BTS/BTP/DUT)' },
  { value: 'Bac +3 (en cours)', label: 'Bac +3 (en cours)' },
  { value: 'Bac +3 accompli (Licence)', label: 'Bac +3 (Licence)' },
  { value: 'Bac +4 (en cours)', label: 'Bac +4 (en cours)' },
  { value: 'Bac +5 (en cours – Master)', label: 'Bac +5 (en cours)' },
  { value: 'Bac +5 accompli (Master)', label: 'Bac +5 (Master)' },
  { value: 'Bac +6+ (Doctorat / PhD)', label: 'Bac +6+ (PhD)' },
];

const LANGUAGE_OPTIONS = ['English', 'French', 'Italian', 'Spanish', 'German', 'Arabic', 'Other'];
const LANGUAGE_LEVEL_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];
const LANGUAGE_CERTIFICATE_OPTIONS = ['IELTS', 'TOEFL', 'TOEIC', 'Cambridge', 'Duolingo', 'DELF', 'DALF', 'None'];

export default function ClientProfileSection({ data, onChange }) {
  const selectedDiplomas = Array.isArray(data.obtainedDiploma) ? data.obtainedDiploma : [];
  const selectedLanguages = Array.isArray(data.languages) ? data.languages : [];
  const academicRecords = data.academicRecords || [];
  const languageRecords = data.languageRecords || [];

  const updateAcademicRecord = (idx, key, value) => {
    const next = academicRecords.map((record, i) => (i === idx ? { ...record, [key]: value } : record));
    onChange({ ...data, academicRecords: next });
  };

  const toggleObtainedDiploma = (diploma) => {
    const nextSelected = selectedDiplomas.includes(diploma)
      ? selectedDiplomas.filter((d) => d !== diploma)
      : [...selectedDiplomas, diploma];
    const map = new Map(academicRecords.map((r) => [r.diploma, r]));
    const nextRecords = nextSelected.map((d) => map.get(d) || { diploma: d, score: '', maxScore: '' });
    onChange({ ...data, obtainedDiploma: nextSelected, academicRecords: nextRecords });
  };

  const computeGpa = (score, maxScore) => {
    const s = Number(score);
    const m = Number(maxScore);
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return '';
    return ((s / m) * 4).toFixed(2);
  };

  const toggleLanguage = (language) => {
    const nextSelected = selectedLanguages.includes(language)
      ? selectedLanguages.filter((l) => l !== language)
      : [...selectedLanguages, language];
    const map = new Map(languageRecords.map((r) => [r.language, r]));
    const nextRecords = nextSelected.map((lang) => map.get(lang) || { language: lang, level: '', certificate: '' });
    onChange({ ...data, languages: nextSelected, languageRecords: nextRecords });
  };

  const updateLanguageRecord = (idx, key, value) => {
    const next = languageRecords.map((record, i) => (i === idx ? { ...record, [key]: value } : record));
    onChange({ ...data, languageRecords: next });
  };

  return (
    <Card accent="from-violet-600 to-violet-400">
      <CardHeader
        icon={GraduationCapIcon}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        sectionLabel="Section 3"
        title="Student Profile"
        hint="Academic background and language profile."
      />

      <div className="space-y-10 p-6 sm:p-8">
        <div>
          <SectionTitle>Status &amp; Education</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Current Status</FieldLabel>
              <Select
                options={CURRENT_STATUS_OPTIONS}
                placeholder="Select status"
                value={data.currentStatus || ''}
                onChange={(e) => onChange({ ...data, currentStatus: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Academic Level</FieldLabel>
              <Select
                options={ACADEMIC_LEVEL_OPTIONS}
                placeholder="Select level"
                value={data.academicLevel || ''}
                onChange={(e) => onChange({ ...data, academicLevel: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Obtained Diplomas</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {OBTAINED_DIPLOMA_OPTIONS.map((opt) => (
              <PillButton
                key={opt.value}
                selected={selectedDiplomas.includes(opt.value)}
                onClick={() => toggleObtainedDiploma(opt.value)}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {academicRecords.length > 0 && (
          <div>
            <SectionTitle>Academic Records</SectionTitle>
            <div className="space-y-3">
              {academicRecords.map((record, idx) => (
                <div key={idx} className="grid gap-3 rounded-xl border border-border bg-canvas p-4 sm:grid-cols-12">
                  <div className="space-y-1 sm:col-span-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Diploma</p>
                    <div className="flex h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-strong">
                      {record.diploma}
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Score</p>
                    <TextInput
                      type="number"
                      placeholder="e.g. 14"
                      value={record.score}
                      onChange={(e) => updateAcademicRecord(idx, 'score', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Max</p>
                    <TextInput
                      type="number"
                      placeholder="e.g. 20"
                      value={record.maxScore}
                      onChange={(e) => updateAcademicRecord(idx, 'maxScore', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">GPA</p>
                    <div
                      className={`flex h-11 items-center justify-center rounded-lg border px-3 text-sm font-bold ${
                        computeGpa(record.score, record.maxScore)
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : 'border-border bg-canvas text-text-muted'
                      }`}
                    >
                      {computeGpa(record.score, record.maxScore) || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionTitle>Study History</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Field of Previous Studies</FieldLabel>
              <TextInput
                placeholder="e.g. Engineering, Economics"
                value={data.fieldOfPreviousStudies}
                onChange={(e) => onChange({ ...data, fieldOfPreviousStudies: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Year of Graduation</FieldLabel>
              <TextInput
                type="number"
                placeholder="YYYY"
                min={1900}
                max={2100}
                value={data.yearOfGraduation}
                onChange={(e) => onChange({ ...data, yearOfGraduation: e.target.value })}
              />
            </div>
          </div>
        </div>

        {data.currentStatus === 'Employed' && (
          <div className="space-y-1.5">
            <FieldLabel>Current Occupation</FieldLabel>
            <TextInput
              placeholder="e.g. Software Developer"
              value={data.currentOccupation}
              onChange={(e) => onChange({ ...data, currentOccupation: e.target.value })}
            />
          </div>
        )}

        <div>
          <SectionTitle>Language Profile</SectionTitle>
          <div className="mb-4 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => (
              <PillButton key={lang} selected={selectedLanguages.includes(lang)} onClick={() => toggleLanguage(lang)}>
                {lang}
              </PillButton>
            ))}
          </div>

          {languageRecords.length > 0 && (
            <div className="space-y-3">
              {languageRecords.map((record, idx) => (
                <div key={idx} className="grid gap-3 rounded-xl border border-border bg-canvas p-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Language</p>
                    <div className="flex h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-strong">
                      {record.language}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Level</p>
                    <Select
                      options={LANGUAGE_LEVEL_OPTIONS.map((l) => ({ value: l, label: l }))}
                      placeholder="Select level"
                      value={record.level || ''}
                      onChange={(e) => updateLanguageRecord(idx, 'level', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Certificate</p>
                    <Select
                      options={LANGUAGE_CERTIFICATE_OPTIONS.map((c) => ({ value: c, label: c }))}
                      placeholder="Select certificate"
                      value={record.certificate || ''}
                      onChange={(e) => updateLanguageRecord(idx, 'certificate', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Note</FieldLabel>
          <TextInput
            placeholder="Any additional notes about the student…"
            value={data.note}
            onChange={(e) => onChange({ ...data, note: e.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
