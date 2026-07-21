import Avatar from './Avatar.jsx';
import Badge from './Badge.jsx';
import { EmptyState, SkeletonRows } from './states.jsx';
import { chipStyle, dotStyle } from '../lib/colors.js';
import { formatEUR, formatTND } from '../lib/format.js';

const COLUMNS = [
  'Étudiant',
  'Prospect Situation',
  'Appli.',
  'Admission',
  'Université',
  'Payé',
  'Restant',
  'Scholarship',
  'Visa',
];

const EMPTY = {};

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

function VisaCell({ value, colorMap }) {
  if (!value) return <Muted />;
  const c = dotStyle(colorMap[value]);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium" style={{ color: c.text }}>
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: c.dot }}
      />
      {value}
    </span>
  );
}

function ProspectRow({ p, colors }) {
  return (
    <tr className="border-b border-border transition hover:bg-canvas/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            first={p.firstName}
            last={p.lastName}
            fullName={p.fullName}
            seed={p.prospectId || p.id}
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
      <td className="px-4 py-3">
        <SituationBadges values={p.situations} colorMap={colors.situation} />
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
        {p.scholarshipStatus ? (
          (() => {
            const c = chipStyle(colors.scholarship[p.scholarshipStatus]);
            return (
              <Badge label={p.scholarshipStatus} bg={c.bg} text={c.text} />
            );
          })()
        ) : (
          <Muted />
        )}
      </td>
      <td className="px-4 py-3">
        <VisaCell value={p.visaStatus} colorMap={colors.visa} />
      </td>
    </tr>
  );
}

export default function ProspectsTable({ rows, loading, colors }) {
  const palette = {
    situation: colors?.situation || EMPTY,
    scholarship: colors?.scholarship || EMPTY,
    visa: colors?.visa || EMPTY,
    admission: colors?.admission || EMPTY,
  };
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows rows={8} cols={COLUMNS.length} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length}>
                <EmptyState />
              </td>
            </tr>
          ) : (
            rows.map((p) => <ProspectRow key={p.id} p={p} colors={palette} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
