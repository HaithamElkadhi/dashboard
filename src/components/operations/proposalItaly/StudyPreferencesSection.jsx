import { BookOpenIcon } from '../../icons.jsx';
import { Card, CardHeader, FieldLabel, Select, SectionTitle, TextArea } from './shared.jsx';

const DEGREE_LEVELS_ITALY = [
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'researcher', label: 'Searcher' },
  { value: 'phd', label: 'PHD' },
  { value: 'formation-prof', label: 'Formation Prof' },
];

const INTAKES = [
  { value: '2026/2027', label: '2026/2027' },
  { value: '2027/2028', label: '2027/2028' },
  { value: 'Flexible', label: 'Flexible' },
];

const PROGRAM_LANGUAGE_OPTIONS = ['EN', 'IT'];

const CITY_PREFERENCE_OPTIONS = [
  { value: 'large_international', label: 'Large international city', desc: 'Milan, Rome, Turin' },
  { value: 'student_city', label: 'Student city', desc: 'Bologna, Padua, Pisa' },
  { value: 'affordable_south', label: 'Affordable southern region', desc: 'Naples, Palermo, Bari' },
  { value: 'no_preference', label: 'No preference', desc: 'Best admission chance' },
];

export default function StudyPreferencesSection({ data, onChange }) {
  const toggleProgramLanguage = (option) => {
    const current = data.programLanguages || [];
    const updated = current.includes(option) ? current.filter((s) => s !== option) : [...current, option];
    onChange({ ...data, programLanguages: updated });
  };

  return (
    <Card accent="from-blue-600 to-cyan-400">
      <CardHeader
        icon={BookOpenIcon}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        sectionLabel="Section 4"
        title="Study Preferences"
        hint="Target degree, intake, and destination preferences."
      />

      <div className="space-y-10 p-6 sm:p-8">
        <div>
          <SectionTitle>Target Program</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Degree Level</FieldLabel>
              <Select
                options={DEGREE_LEVELS_ITALY}
                placeholder="Select degree"
                value={data.targetDegreeLevel || ''}
                onChange={(e) => onChange({ ...data, targetDegreeLevel: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Intended Intake</FieldLabel>
              <Select
                options={INTAKES}
                placeholder="Select intake"
                value={data.intendedIntake || ''}
                onChange={(e) => onChange({ ...data, intendedIntake: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Field of Study</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Primary Field</FieldLabel>
              <input
                placeholder="e.g. Engineering, Economics, Medicine"
                value={data.fieldOfStudyPrimary}
                onChange={(e) => onChange({ ...data, fieldOfStudyPrimary: e.target.value })}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>
                Alternative Field{' '}
                <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
              </FieldLabel>
              <input
                placeholder="e.g. Data Science, International Relations"
                value={data.alternativeField}
                onChange={(e) => onChange({ ...data, alternativeField: e.target.value })}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
              />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Preferred Teaching Language</SectionTitle>
          <div className="flex gap-3">
            {PROGRAM_LANGUAGE_OPTIONS.map((option) => {
              const selected = (data.programLanguages || []).includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleProgramLanguage(option)}
                  className={`flex h-12 w-20 items-center justify-center rounded-xl border-2 text-lg font-bold transition ${
                    selected
                      ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                      : 'border-border text-text-muted hover:border-border-strong hover:bg-canvas'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <SectionTitle>Preferred City Type</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {CITY_PREFERENCE_OPTIONS.map((opt) => {
              const selected = data.cityPreferenceType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...data, cityPreferenceType: opt.value })}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                    selected ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-border-strong hover:bg-canvas'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? 'border-blue-500 bg-blue-500' : 'border-border-strong'
                    }`}
                  >
                    {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-text-strong'}`}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Preferred City / University</FieldLabel>
          <TextArea
            placeholder="Write preferred cities, universities, or any detailed notes…"
            value={data.preferredCityUniversity}
            onChange={(e) => onChange({ ...data, preferredCityUniversity: e.target.value })}
            rows={3}
          />
        </div>
      </div>
    </Card>
  );
}
