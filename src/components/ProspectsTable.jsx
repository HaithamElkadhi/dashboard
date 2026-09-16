import { useMemo } from 'react';
import Avatar from './Avatar.jsx';
import Badge from './Badge.jsx';
import Pagination from './Pagination.jsx';
import { EmptyState, SkeletonRows } from './states.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { chipStyle, dotStyle } from '../lib/colors.js';
import { formatEUR, formatTND } from '../lib/format.js';
import { PencilIcon, TrashIcon, WalletIcon } from './icons.jsx';
import { formatShortDate } from '../lib/taskDates.js';

const BASE_COLUMNS = [
  'Étudiant',
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

const ALL_COLUMNS = [
  'Étudiant',
  'Prospect Situation',
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

function ProspectCard({ p, colors, showSituation, onEdit, onDelete, onBourse }) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <Avatar
          first={p.firstName}
          last={p.lastName}
          fullName={p.fullName}
          seed={p.prospectId || p.id}
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
              <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium tabular-nums text-text-muted">
                {p.nbrApplications || 0} appli.
              </span>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  title="Modifier"
                  className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
                >
                  <PencilIcon size={13} />
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
                <button
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

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
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

function ProspectRow({ p, colors, showSituation, onEdit, onDelete, onBourse }) {
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
      {showSituation && (
        <td className="px-4 py-3">
          <SituationBadges values={p.situations} colorMap={colors.situation} />
        </td>
      )}
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
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(p)}
              title="Modifier"
              className="rounded-lg border border-border p-1.5 text-text-muted transition hover:border-border-strong hover:text-text-strong"
            >
              <PencilIcon size={14} />
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
            <button
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
}) {
  const palette = {
    situation: colors?.situation || EMPTY,
    scholarship: colors?.scholarship || EMPTY,
    visa: colors?.visa || EMPTY,
    admission: colors?.admission || EMPTY,
    universitaly: colors?.universitaly || EMPTY,
  };

  const columns = showSituation ? ALL_COLUMNS : BASE_COLUMNS;

  const resetKey = useMemo(
    () => `${rows.length}:${rows[0]?.id ?? ''}:${rows[rows.length - 1]?.id ?? ''}:${showSituation}`,
    [rows, showSituation]
  );
  const pagination = usePagination(rows, { resetKey });
  const visible = loading ? [] : pagination.pageItems;

  return (
    <>
      {/* Desktop / tablet: full table */}
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] border-collapse text-left">
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
