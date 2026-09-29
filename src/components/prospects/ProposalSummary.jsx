import {
  CITY_LABELS,
  DEGREE_LABELS,
  FINANCING_PLAN_LABELS,
  GUARANTOR_LABELS,
  YES_NO_LABELS,
  toGpa,
} from '../../lib/proposalItaly/emailBody.js';
import {
  BookOpenIcon,
  GraduationCapIcon,
  PackageIcon,
  UserIcon,
  WalletIcon,
} from '../icons.jsx';

// Read-only, organised view of a Proposal — Italy (same data as the proposal
// form), shown first in the Prospects → Proposal popup.

const label = (map, v) => (v ? map[v] || v : '');

function formatDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR');
}

function Section({ icon: Icon, tone, title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={14} />
        </span>
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function Fields({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v, wide]) => (
        <div key={k} className={wide ? 'sm:col-span-2' : ''}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{k}</dt>
          <dd className={`mt-0.5 whitespace-pre-line text-sm ${v ? 'text-text-strong' : 'text-text-muted'}`}>
            {v || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ values, empty = '—' }) {
  if (!values?.length) return <span className="text-sm text-text-muted">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span key={v} className="rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs font-medium text-text-strong">
          {v}
        </span>
      ))}
    </div>
  );
}

function MiniTable({ head, rows, empty }) {
  if (!rows.length) return <p className="text-sm text-text-muted">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-canvas text-left text-[11px] uppercase tracking-wide text-text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t border-border">
              {r.map((c, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 ${i === 0 ? 'font-medium text-text-strong' : 'text-right tabular-nums text-text-strong'}`}
                >
                  {c || <span className="text-text-muted">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubTitle({ children }) {
  return <p className="mb-2 text-xs font-semibold text-text-muted">{children}</p>;
}

export default function ProposalSummary({ data }) {
  const sp = data.studentProfile || {};
  const prefs = data.studyPreferences || {};
  const svc = data.services || {};

  const diplomaRows = (sp.academicRecords || []).map((r) => [
    r.diploma,
    r.score,
    r.maxScore,
    toGpa(r.score, r.maxScore),
  ]);
  const languageRows = (sp.languageRecords || []).map((r) => [r.language, r.level, r.certificate]);
  // Airtable text that couldn't be split into rows (e.g. an old free-text value).
  const showAcademicText = !diplomaRows.length && sp.academicDescription;
  const showLanguageText = !languageRows.length && sp.languageDescription;

  return (
    <div className="space-y-4">
      {/* Student header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-surface p-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-text-strong">{data.studentName || '—'}</p>
          <p className="mt-0.5 break-all text-sm text-text-muted">
            {[data.email, data.phone, data.nationality].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <dl className="flex gap-5 text-right">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Proposal date</dt>
            <dd className="text-sm font-medium text-text-strong">{formatDate(data.proposalDate) || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Valid until</dt>
            <dd className="text-sm font-medium text-text-strong">{formatDate(data.validUntil) || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={GraduationCapIcon} tone="bg-violet-50 text-violet-600" title="Student profile">
          <Fields
            items={[
              ['Current status', sp.currentStatus],
              ['Academic level', sp.academicLevel],
              ['Field of previous studies', sp.fieldOfPreviousStudies],
              ['Year of graduation', sp.yearOfGraduation],
              ...(sp.currentOccupation ? [['Current occupation', sp.currentOccupation, true]] : []),
            ]}
          />
          <div>
            <SubTitle>Diplomas</SubTitle>
            {showAcademicText ? (
              <p className="whitespace-pre-line text-sm text-text-strong">{sp.academicDescription}</p>
            ) : (
              <MiniTable head={['Diploma', 'Score', 'Max', 'GPA']} rows={diplomaRows} empty="No diploma." />
            )}
          </div>
          <div>
            <SubTitle>Languages</SubTitle>
            {showLanguageText ? (
              <p className="whitespace-pre-line text-sm text-text-strong">{sp.languageDescription}</p>
            ) : (
              <MiniTable head={['Language', 'Level', 'Certificate']} rows={languageRows} empty="No language." />
            )}
          </div>
          {sp.note && <Fields items={[['Note', sp.note, true]]} />}
        </Section>

        <div className="space-y-4">
          <Section icon={BookOpenIcon} tone="bg-sky-50 text-sky-600" title="Study preferences">
            <Fields
              items={[
                ['Target degree', label(DEGREE_LABELS, prefs.targetDegreeLevel)],
                ['Intended intake', prefs.intendedIntake],
                ['Primary field', prefs.fieldOfStudyPrimary],
                ['Alternative field', prefs.alternativeField],
                ['City preference', label(CITY_LABELS, prefs.cityPreferenceType)],
                ['Preferred city / university', prefs.preferredCityUniversity],
              ]}
            />
            <div>
              <SubTitle>Program languages</SubTitle>
              <Chips values={prefs.programLanguages} />
            </div>
          </Section>

          <Section icon={WalletIcon} tone="bg-emerald-50 text-emerald-600" title="Financial situation">
            <Fields
              items={[
                ['Financing plan', label(FINANCING_PLAN_LABELS, prefs.financingPlan), true],
                ['Financial guarantor', label(GUARANTOR_LABELS, prefs.financialGuarantor)],
                ['Available budget', prefs.projectBudget ? `${prefs.projectBudget} €` : ''],
                ['Blocked account', label(YES_NO_LABELS, prefs.blockedAccount)],
                ['Support from abroad', label(YES_NO_LABELS, prefs.hasAbroadSupport)],
                ...(prefs.abroadSupportDetails ? [['Abroad support details', prefs.abroadSupportDetails, true]] : []),
              ]}
            />
          </Section>
        </div>
      </div>

      <Section icon={PackageIcon} tone="bg-amber-50 text-amber-600" title="Services">
        <Chips values={svc.selected} empty="No service selected." />
        {svc.note && <Fields items={[['Note', svc.note, true]]} />}
      </Section>

      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <UserIcon size={12} />
        Loaded from the prospect in Airtable.
      </p>
    </div>
  );
}
