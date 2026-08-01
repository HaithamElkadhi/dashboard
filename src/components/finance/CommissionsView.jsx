import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../Badge.jsx';
import MetricCard from './MetricCard.jsx';
import { formatMoney } from '../../lib/format.js';
import { computeMoezAmount } from '../../lib/airtable.js';
import { MOEZ_TYPES } from '../../lib/config.js';
import { MOEZ_INVOICE_SCOPES, generateMoezInvoice } from '../../lib/moezInvoice.js';

function MoezInvoiceButton({ paiements }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const handlePick = (scope) => {
    generateMoezInvoice(paiements, scope);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-strong transition hover:border-border-strong"
      >
        📄 Facture PDF
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {MOEZ_INVOICE_SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => handlePick(s.key)}
              className="block w-full px-3 py-2 text-left text-sm text-text-strong transition hover:bg-canvas"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function sumByCurrency(rows, pick) {
  const totals = {};
  for (const r of rows) totals[r.currency] = (totals[r.currency] || 0) + pick(r);
  return totals;
}

function currencyTotalsLabel(rows, pick) {
  const totals = sumByCurrency(rows, pick);
  const entries = Object.entries(totals);
  if (entries.length === 0) return '—';
  return entries.map(([cur, val]) => formatMoney(val, cur)).join(' · ');
}

function MoezRow({ p, onSave }) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(p.moezType || 'Aucune');
  const [value, setValue] = useState(String(p.moezValeur ?? ''));
  const [saving, setSaving] = useState(false);

  const cancel = () => {
    setType(p.moezType || 'Aucune');
    setValue(String(p.moezValeur ?? ''));
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(p.id, { moezType: type, moezValeur: Number(value) || 0 });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-text-strong">{p.fullName || '—'}</p>
        <p className="text-xs text-text-muted">{p.reference}</p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-border bg-surface px-1.5 py-1 text-xs"
          >
            {MOEZ_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={type === 'Aucune'}
            className="w-20 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
          >
            {saving ? '…' : 'OK'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums text-text-strong">
            {formatMoney(computeMoezAmount(p), p.currency)}
          </span>
          {p.moezType && p.moezType !== 'Aucune' && (
            <Badge label={p.moezType} bg="#F1EFE8" text="#5F5E5A" />
          )}
          {!p.soldeConfirme && (
            <span className="text-xs font-medium text-text-muted">⏸ Suspendu</span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted transition hover:border-border-strong hover:text-text-strong"
          >
            Éditer
          </button>
        </div>
      )}
    </li>
  );
}

export default function CommissionsView({ paiements, onUpdateMoez }) {
  const moezActive = useMemo(
    () => paiements.filter((p) => p.soldeConfirme && p.moezType && p.moezType !== 'Aucune'),
    [paiements]
  );
  const moezSuspended = useMemo(
    () =>
      paiements.filter(
        (p) => !p.soldeConfirme && p.moezType && p.moezType !== 'Aucune'
      ),
    [paiements]
  );
  const commercialRows = useMemo(
    () => paiements.filter((p) => p.commCommercial),
    [paiements]
  );
  const confirmed = useMemo(() => paiements.filter((p) => p.soldeConfirme), [paiements]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MetricCard
          label="Commission Moez active"
          value={currencyTotalsLabel(moezActive, (r) => r.commissionMoez)}
        />
        <MetricCard
          label="Moez suspendue"
          value={currencyTotalsLabel(moezSuspended, (r) => computeMoezAmount(r))}
          hint={`${moezSuspended.length} paiement${moezSuspended.length > 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Commission Commercial"
          value={currencyTotalsLabel(commercialRows, (r) => r.commCommercial)}
        />
        <MetricCard
          label="Net disponible"
          value={currencyTotalsLabel(confirmed, (r) => r.netARecevoir)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-strong">Commission Moez</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-text-strong">
                {currencyTotalsLabel(moezActive, (r) => r.commissionMoez)}
              </span>
              <MoezInvoiceButton paiements={paiements} />
            </div>
          </div>
          {paiements.filter((p) => p.moezType && p.moezType !== 'Aucune').length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Aucune commission Moez configurée</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {paiements
                .filter((p) => p.moezType && p.moezType !== 'Aucune')
                .map((p) => (
                  <MoezRow key={p.id} p={p} onSave={onUpdateMoez} />
                ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-strong">Commission Commercial</h3>
            <span className="text-sm font-semibold tabular-nums text-text-strong">
              {currencyTotalsLabel(commercialRows, (r) => r.commCommercial)}
            </span>
          </div>
          {commercialRows.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Aucune commission commerciale</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {commercialRows.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-text-strong">{p.fullName || '—'}</p>
                    <p className="text-xs text-text-muted">{p.reference}</p>
                  </div>
                  <span className="font-semibold tabular-nums text-text-strong">
                    {formatMoney(p.commCommercial, p.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
