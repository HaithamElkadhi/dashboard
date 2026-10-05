import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Badge from './Badge.jsx';
import Pagination from './Pagination.jsx';
import { EmptyState, SkeletonRows } from './states.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { chipStyle, dotStyle } from '../lib/colors.js';
import { formatEUR, formatTND } from '../lib/format.js';
import { EyeIcon, FileTextIcon, PencilIcon, TrashIcon, UserIcon, WalletIcon, WhatsAppIcon } from './icons.jsx';
import { formatShortDate } from '../lib/taskDates.js';
import { parseContactHistory } from '../lib/airtable.js';
import { INTEREST_LEVELS } from '../lib/config.js';
import { formatContactDate } from './prospects/ContactLogModal.jsx';

const BASE_COLUMNS = [
  'Étudiant',
  'Dernier contact',
  'Appli.',
  'Admission',
  'Université',
  'Payé',
  'Restant',
  'Scholarship',
  'Visa',
  'Universitaly Validation',
  '',
];


// Lead / Prospect tabs: only what matters before signing.
const PROPOSAL_COLUMNS = ['Étudiant', 'Intérêt', 'Dernier contact', 'Proposal', 'Payé', 'Restant', ''];

// "Tous" tab: school year + stage dates, editable in place.
const ALL_TAB_COLUMNS = [
  'Étudiant',
  'Prospect Situation',
  'Dernier contact',
  'Année scolaire',
  'Date Lead',
  'Date Prospect',
  'Date Candidate',
  'Admission',
  'Payé',
  'Restant',
  'Universitaly Validation',
  '',
];

const STAGE_DATE_COLUMNS = [
  { key: 'dateLead', label: 'Lead' },
  { key: 'dateProspect', label: 'Prospect' },
  { key: 'dateCandidate', label: 'Candidate' },
];

// School year as a dropdown; changing it saves at once. Airtable allows
// several years, so a prospect with 2 shows them together until changed.
function IntakeCell({ p, years, onChange }) {
  const current = p.intakes || [];
  const value = current.length === 1 ? current[0] : current.length > 1 ? '__multi__' : '';
  return (
    <select data-write=""
      value={value}
      onChange={(e) => onChange?.(p, e.target.value ? [e.target.value] : [])}
      disabled={!onChange}
      title="Année scolaire"
      className={`cursor-pointer rounded-lg border px-2 py-1 text-xs font-medium outline-none transition hover:border-border-strong ${
        value ? 'border-border bg-surface text-text-strong' : 'border-dashed border-border bg-surface text-text-muted'
      }`}
    >
      <option value="">— Année</option>
      {value === '__multi__' && <option value="__multi__">{current.join(' + ')}</option>}
      {current.filter((y) => !years.includes(y)).map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

// Stage date, editable in place. Saved when leaving the field (typing a year
// digit by digit would otherwise save intermediate dates).
function StageDateCell({ p, field, onChange }) {
  const saved = p[field] || '';
  const [value, setValue] = useState(saved);
  useEffect(() => setValue(saved), [saved]);
  const commit = () => {
    if (value !== saved) onChange?.(p, field, value);
  };
  return (
    <input data-write=""
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      disabled={!onChange}
      className={`w-[8.5rem] rounded-lg border px-2 py-1 text-xs tabular-nums outline-none transition hover:border-border-strong focus:border-border-strong ${
        value ? 'border-border bg-surface text-text-strong' : 'border-dashed border-border bg-surface text-text-muted'
      }`}
    />
  );
}

const EMPTY = {};

const INTEREST_TONES = {
  Élevé: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Moyen: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  Faible: 'border-orange-200 bg-orange-50 text-orange-800',
  Aucun: 'border-red-200 bg-red-50 text-red-700',
  'Non contacté': 'border-border bg-canvas text-text-muted',
};

// Niveau d'intérêt as an emoji pill; it's a select, so changing it saves.
function InterestCell({ p, onChange }) {
  const value = p.interestLevel || '';
  const tone = INTEREST_TONES[value] || 'border-dashed border-border bg-surface text-text-muted';
  return (
    <select data-write=""
      value={value}
      onChange={(e) => onChange?.(p, e.target.value)}
      disabled={!onChange}
      title="Niveau d'intérêt"
      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition hover:border-border-strong ${tone}`}
    >
      <option value="">— Choisir</option>
      {value && !INTEREST_LEVELS.some((l) => l.value === value) && <option value={value}>{value}</option>}
      {INTEREST_LEVELS.map((l) => (
        <option key={l.value} value={l.value}>
          {l.emoji} {l.value}
        </option>
      ))}
    </select>
  );
}

function daysSince(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
}

// Latest contact (date + motif); click to add a new one. Turns amber after a
// week and red after two weeks without contact.
function LastContactCell({ p, onClick }) {
  const latest = parseContactHistory(p.contactHistory)[0];
  if (!p.lastContact) {
    return (
      <button data-write=""
        type="button"
        onClick={() => onClick(p)}
        className="rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong"
      >
        + Ajouter
      </button>
    );
  }
  const days = daysSince(p.lastContact);
  const tone = days > 14 ? 'text-red-600' : days > 7 ? 'text-amber-700' : 'text-emerald-700';
  const ago = days <= 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} j`;
  return (
    <button
      type="button"
      onClick={() => onClick(p)}
      title={latest?.reason ? `${formatContactDate(p.lastContact)} — ${latest.reason}` : 'Ajouter un contact'}
      className="-mx-2 -my-1 block max-w-[14rem] rounded-lg px-2 py-1 text-left transition hover:bg-canvas"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-sm font-medium tabular-nums text-text-strong">
          {formatContactDate(p.lastContact)}
        </span>
        <span className={`text-xs font-medium ${tone}`}>{ago}</span>
      </span>
      {latest?.reason && <span className="block truncate text-xs text-text-muted">{latest.reason}</span>}
    </button>
  );
}

// Share of the proposal filled in; the missing fields are listed on hover.
function ProposalProgress({ value }) {
  if (!value) return <Muted />;
  const { percent, missing } = value;
  const tone =
    percent >= 80
      ? { bar: 'bg-emerald-500', text: 'text-emerald-700' }
      : percent >= 40
        ? { bar: 'bg-amber-500', text: 'text-amber-700' }
        : { bar: 'bg-red-500', text: 'text-red-600' };
  const title = missing.length ? `Missing: ${missing.join(', ')}` : 'Proposal complete';
  return (
    <div className="flex min-w-[9rem] items-center gap-2.5" title={title}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`w-10 text-right text-sm font-semibold tabular-nums ${tone.text}`}>{percent}%</span>
    </div>
  );
}

function Muted() {
  return <span className="text-text-muted">—</span>;
}

function SituationBadges({ values, colorMap }) {
  if (!values.length) return <Muted />;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => {
        const c = chipStyle(colorMap[v]);
        return <Badge key={v} label={v} bg={c.bg} text={c.text} />;
      })}
    </div>
  );
}

function AdmissionTags({ values, colorMap }) {
  if (!values.length) return <Muted />;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => {
        const c = chipStyle(colorMap[v]);
        return <Badge key={v} label={v} bg={c.bg} text={c.text} />;
      })}
    </div>
  );
}

function PaymentCell({ eur, tnd }) {
  const hasEur = eur > 0;
  const hasTnd = tnd > 0;
  if (!hasEur && !hasTnd) return <Muted />;
  return (
    <div className="flex flex-col leading-tight">
      {hasEur && (
        <span className="text-sm font-medium text-text-strong">
          {formatEUR(eur)}
        </span>
      )}
      {hasTnd && (
        <span className="text-xs text-text-muted">{formatTND(tnd)}</span>
      )}
    </div>
  );
}

function VisaCell({ value, colorMap, appointmentDate }) {
  if (!value) return <Muted />;
  const c = dotStyle(colorMap[value]);
  return (
    <div className="flex flex-col leading-tight">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: c.text }}>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: c.dot }}
        />
        {value}
      </span>
      {appointmentDate && (
        <span className="mt-0.5 pl-3.5 text-xs text-text-muted">
          RDV {formatShortDate(appointmentDate)}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ value, colorMap }) {
  if (!value) return <Muted />;
  const c = chipStyle(colorMap[value]);
  return <Badge label={value} bg={c.bg} text={c.text} />;
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text-strong">{children}</dd>
    </div>
  );
}

function ProspectCard({ p, colors, showSituation, onEdit, onDelete, onBourse, onProposal, onFiche, onContact, onInterest, onWhatsApp, onIntakeChange, onDateChange, intakeYears = [], proposalMode }) {
  const { readOnly } = useAuth();
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <Avatar
          first={p.firstName}
          last={p.lastName}
          fullName={p.fullName}
          seed={p.prospectId || p.id}
          src={p.photoUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium capitalize text-text-strong">
                {p.fullName || '—'}
              </div>
              <div className="truncate text-xs text-text-muted">
                {p.prospectId || '—'}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {!proposalMode && (
                <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium tabular-nums text-text-muted">
                  {p.nbrApplications || 0} appli.
                </span>
              )}
              {(p.whatsappLink || p.phone || p.whatsappNumber) && (
                <button
                  type="button"
                  onClick={() => onWhatsApp?.(p)}
                  title="WhatsApp"
                  aria-label={`WhatsApp ${p.fullName}`}
                  className="rounded-lg border border-border p-1.5 text-[#25D366] transition hover:border-[#25D366] hover:bg-[#25D366]/10"
                >
                  <WhatsAppIcon size={13} />
                </button>
              )}

              {onEdit && (
                <button data-write={readOnly ? undefined : ''}
                  type="button"
                  onClick={() => onEdit(p)}
                  title={readOnly ? 'Details' : 'Modifier'}
                  className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
                >
                  {readOnly ? <EyeIcon size={13} /> : <PencilIcon size={13} />}
                </button>
              )}
              {onFiche && (
                <button
                  type="button"
                  onClick={() => onFiche(p)}
                  title="Fiche client"
                  className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
                >
                  <UserIcon size={13} />
                </button>
              )}
              {onProposal && (
                <button
                  type="button"
                  onClick={() => onProposal(p)}
                  title="Proposal"
                  className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
                >
                  <FileTextIcon size={13} />
                </button>
              )}
              {onBourse && (
                <button
                  type="button"
                  onClick={() => onBourse(p)}
                  title="Bourse"
                  className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
                >
                  <WalletIcon size={13} />
                </button>
              )}
              {onDelete && (
                <button data-write=""
                  type="button"
                  onClick={() => onDelete(p)}
                  title="Supprimer"
                  className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon size={13} />
                </button>
              )}
            </div>
          </div>
          {showSituation && (
            <div className="mt-2">
              <SituationBadges values={p.situations} colorMap={colors.situation} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3"><a href={`/students/${p.id}/documents`} target="_blank" rel="noopener noreferrer" title="Documents" aria-label={`Documents for ${p.fullName}`} className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"><FileTextIcon size={14} /></a></div>
      {proposalMode ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div className="col-span-2">
            <Field label="Intérêt">
              <InterestCell p={p} onChange={onInterest} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Dernier contact">
              <LastContactCell p={p} onClick={onContact} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Proposal">
              <ProposalProgress value={p.proposal} />
            </Field>
          </div>
          <Field label="Payé">
            <PaymentCell eur={p.pay.eurPaid} tnd={p.pay.tndPaid} />
          </Field>
          <Field label="Restant">
            <PaymentCell eur={p.pay.eurDue} tnd={p.pay.tndDue} />
          </Field>
        </dl>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {showSituation && (
            <>
              <Field label="Année scolaire">
                <IntakeCell p={p} years={intakeYears} onChange={onIntakeChange} />
              </Field>
              {STAGE_DATE_COLUMNS.map((d) => (
                <Field key={d.key} label={`Date ${d.label}`}>
                  <StageDateCell p={p} field={d.key} onChange={onDateChange} />
                </Field>
              ))}
            </>
          )}
          <div className="col-span-2">
            <Field label="Dernier contact">
              <LastContactCell p={p} onClick={onContact} />
            </Field>
          </div>
          <Field label="Admission">
            <AdmissionTags values={p.admissionStatus} colorMap={colors.admission} />
          </Field>
          <Field label="Université">
            {p.university ? p.university : <Muted />}
          </Field>
          <Field label="Payé">
            <PaymentCell eur={p.pay.eurPaid} tnd={p.pay.tndPaid} />
          </Field>
          <Field label="Restant">
            <PaymentCell eur={p.pay.eurDue} tnd={p.pay.tndDue} />
          </Field>
          <Field label="Scholarship">
            <StatusBadge value={p.scholarshipStatus} colorMap={colors.scholarship} />
          </Field>
          <Field label="Visa">
            <VisaCell
              value={p.visaStatus}
              colorMap={colors.visa}
              appointmentDate={p.visaAppointmentDate}
            />
          </Field>
          <Field label="Universitaly Validation">
            <StatusBadge value={p.universitalyValidation} colorMap={colors.universitaly} />
          </Field>
        </dl>
      )}
    </div>
  );
}

function SkeletonCards({ count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, j) => (
          <div key={j} className="skeleton h-8 rounded" />
        ))}
      </div>
    </div>
  ));
}

function ProspectRow({ p, colors, showSituation, onEdit, onDelete, onBourse, onProposal, onFiche, onContact, onInterest, onWhatsApp, onIntakeChange, onDateChange, intakeYears = [], proposalMode }) {
  const { readOnly } = useAuth();
  return (
    <tr className="border-b border-border transition hover:bg-canvas/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            first={p.firstName}
            last={p.lastName}
            fullName={p.fullName}
            seed={p.prospectId || p.id}
            src={p.photoUrl}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium capitalize text-text-strong">
              {p.fullName || '—'}
            </div>
            <div className="truncate text-xs text-text-muted">
              {p.prospectId || '—'}
            </div>
          </div>
        </div>
      </td>
      {showSituation && (
        <td className="px-4 py-3">
          <SituationBadges values={p.situations} colorMap={colors.situation} />
        </td>
      )}
      {proposalMode ? (
        <>
          <td className="px-4 py-3">
            <InterestCell p={p} onChange={onInterest} />
          </td>
          <td className="px-4 py-3">
            <LastContactCell p={p} onClick={onContact} />
          </td>
          <td className="px-4 py-3">
            <ProposalProgress value={p.proposal} />
          </td>
          <td className="px-4 py-3">
            <PaymentCell eur={p.pay.eurPaid} tnd={p.pay.tndPaid} />
          </td>
          <td className="px-4 py-3">
            <PaymentCell eur={p.pay.eurDue} tnd={p.pay.tndDue} />
          </td>
        </>
      ) : showSituation ? (
        <>
          <td className="px-4 py-3">
            <LastContactCell p={p} onClick={onContact} />
          </td>
          <td className="px-4 py-3">
            <IntakeCell p={p} years={intakeYears} onChange={onIntakeChange} />
          </td>
          {STAGE_DATE_COLUMNS.map((d) => (
            <td key={d.key} className="px-4 py-3">
              <StageDateCell p={p} field={d.key} onChange={onDateChange} />
            </td>
          ))}
          <td className="px-4 py-3">
            <AdmissionTags values={p.admissionStatus} colorMap={colors.admission} />
          </td>
          <td className="px-4 py-3">
            <PaymentCell eur={p.pay.eurPaid} tnd={p.pay.tndPaid} />
          </td>
          <td className="px-4 py-3">
            <PaymentCell eur={p.pay.eurDue} tnd={p.pay.tndDue} />
          </td>
          <td className="px-4 py-3">
            <StatusBadge value={p.universitalyValidation} colorMap={colors.universitaly} />
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-3">
            <LastContactCell p={p} onClick={onContact} />
          </td>
          <td className="px-4 py-3">
            <span className="text-sm tabular-nums text-text-strong">
              {p.nbrApplications || 0}
            </span>
          </td>
          <td className="px-4 py-3">
            <AdmissionTags values={p.admissionStatus} colorMap={colors.admission} />
          </td>
          <td className="px-4 py-3">
            {p.university ? (
              <span className="text-sm text-text-strong">{p.university}</span>
            ) : (
              <Muted />
            )}
          </td>
          <td className="px-4 py-3">
            <PaymentCell eur={p.pay.eurPaid} tnd={p.pay.tndPaid} />
          </td>
          <td className="px-4 py-3">
            <PaymentCell eur={p.pay.eurDue} tnd={p.pay.tndDue} />
          </td>
          <td className="px-4 py-3">
            <StatusBadge value={p.scholarshipStatus} colorMap={colors.scholarship} />
          </td>
          <td className="px-4 py-3">
            <VisaCell
              value={p.visaStatus}
              colorMap={colors.visa}
              appointmentDate={p.visaAppointmentDate}
            />
          </td>
          <td className="px-4 py-3">
            <StatusBadge value={p.universitalyValidation} colorMap={colors.universitaly} />
          </td>
        </>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {(p.whatsappLink || p.phone || p.whatsappNumber) && (
            <button
              type="button"
              onClick={() => onWhatsApp?.(p)}
              title="WhatsApp"
              aria-label={`WhatsApp ${p.fullName}`}
              className="rounded-lg border border-border p-1.5 text-[#25D366] transition hover:border-[#25D366] hover:bg-[#25D366]/10"
            >
              <WhatsAppIcon size={14} />
            </button>
          )}
          <a href={`/students/${p.id}/documents`} target="_blank" rel="noopener noreferrer" title="Documents" aria-label={`Documents for ${p.fullName}`} className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"><FileTextIcon size={14} /></a>
              {onEdit && (
            <button data-write={readOnly ? undefined : ''}
              type="button"
              onClick={() => onEdit(p)}
              title={readOnly ? 'Details' : 'Modifier'}
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
            >
              {readOnly ? <EyeIcon size={14} /> : <PencilIcon size={14} />}
            </button>
          )}
          {onFiche && (
            <button
              type="button"
              onClick={() => onFiche(p)}
              title="Fiche client"
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
            >
              <UserIcon size={14} />
            </button>
          )}
          {onProposal && (
            <button
              type="button"
              onClick={() => onProposal(p)}
              title="Proposal"
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
            >
              <FileTextIcon size={14} />
            </button>
          )}
          {onBourse && (
            <button
              type="button"
              onClick={() => onBourse(p)}
              title="Bourse"
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
            >
              <WalletIcon size={14} />
            </button>
          )}
          {onDelete && (
            <button data-write=""
              type="button"
              onClick={() => onDelete(p)}
              title="Supprimer"
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ProspectsTable({
  rows,
  loading,
  colors,
  showSituation = true,
  onEdit,
  onDelete,
  onBourse,
  onProposal,
  onFiche,
  onContact,
  onInterest,
  onWhatsApp,
  onIntakeChange,
  onDateChange,
  intakeYears = [],
  proposalMode = false,
}) {
  const palette = {
    situation: colors?.situation || EMPTY,
    scholarship: colors?.scholarship || EMPTY,
    visa: colors?.visa || EMPTY,
    admission: colors?.admission || EMPTY,
    universitaly: colors?.universitaly || EMPTY,
  };

  const columns = proposalMode ? PROPOSAL_COLUMNS : showSituation ? ALL_TAB_COLUMNS : BASE_COLUMNS;

  const resetKey = useMemo(
    () => `${rows.length}:${rows[0]?.id ?? ''}:${rows[rows.length - 1]?.id ?? ''}:${showSituation}:${proposalMode}`,
    [rows, showSituation, proposalMode]
  );
  const pagination = usePagination(rows, { resetKey });
  const visible = loading ? [] : pagination.pageItems;

  return (
    <>
      {/* Desktop / tablet: full table */}
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <table
          className={`w-full border-collapse text-left ${proposalMode ? 'min-w-[880px]' : showSituation ? 'min-w-[1400px]' : 'min-w-[1120px]'}`}
        >
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col || 'actions'}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={8} cols={columns.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState />
                </td>
              </tr>
            ) : (
              visible.map((p) => (
                <ProspectRow
                  key={p.id}
                  p={p}
                  colors={palette}
                  showSituation={showSituation}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onBourse={onBourse}
                  onProposal={onProposal}
                  onFiche={onFiche}
                  onContact={onContact}
                  onInterest={onInterest}
                  onWhatsApp={onWhatsApp}
                  onIntakeChange={onIntakeChange}
                  onDateChange={onDateChange}
                  intakeYears={intakeYears}
                  proposalMode={proposalMode}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="divide-y divide-border md:hidden">
        {loading ? (
          <SkeletonCards count={6} />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          visible.map((p) => (
            <ProspectCard
              key={p.id}
              p={p}
              colors={palette}
              showSituation={showSituation}
              onEdit={onEdit}
              onDelete={onDelete}
              onBourse={onBourse}
              onProposal={onProposal}
              onFiche={onFiche}
              onContact={onContact}
              onInterest={onInterest}
              onWhatsApp={onWhatsApp}
              onIntakeChange={onIntakeChange}
              onDateChange={onDateChange}
              intakeYears={intakeYears}
              proposalMode={proposalMode}
            />
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          from={pagination.from}
          to={pagination.to}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </>
  );
}
