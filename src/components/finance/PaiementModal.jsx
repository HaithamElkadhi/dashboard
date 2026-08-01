import { useState } from 'react';
import ProspectPicker from '../tasks/ProspectPicker.jsx';
import { CURRENCIES, PAYMENT_STATUSES, MOEZ_TYPES } from '../../lib/config.js';

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-text-strong">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function emptyForm() {
  return {
    prospect: null,
    amount: '',
    currency: 'EUR',
    status: 'À payer',
    paymentMethod: '',
    taxe: '',
    commCommercial: '',
    moezType: 'Aucune',
    moezValeur: '',
    dueDate: '',
    paymentDate: '',
    purpose: [],
    comment: '',
    exemptionReason: '',
    billingAddress: '',
    soldeConfirme: false,
  };
}

export default function PaiementModal({
  open,
  mode,
  paiement,
  people,
  purposeChoices,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => {
    if (mode !== 'edit' || !paiement) return emptyForm();
    return {
      prospect: null,
      amount: String(paiement.amount ?? ''),
      currency: paiement.currency || 'EUR',
      status: paiement.status || 'À payer',
      paymentMethod: paiement.paymentMethod || '',
      taxe: String(paiement.taxe ?? ''),
      commCommercial: String(paiement.commCommercial ?? ''),
      moezType: paiement.moezType || 'Aucune',
      moezValeur: String(paiement.moezValeur ?? ''),
      dueDate: paiement.dueDate || '',
      paymentDate: paiement.paymentDate || '',
      purpose: paiement.purpose || [],
      comment: paiement.comment || '',
      exemptionReason: paiement.exemptionReason || '',
      billingAddress: paiement.billingAddress || '',
      soldeConfirme: !!paiement.soldeConfirme,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setChecked = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));
  const togglePurpose = (label) =>
    setForm((f) => ({
      ...f,
      purpose: f.purpose.includes(label)
        ? f.purpose.filter((p) => p !== label)
        : [...f.purpose, label],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'create' && !form.prospect) {
      setError('Sélectionne un prospect.');
      return;
    }
    if (!form.amount || Number.isNaN(Number(form.amount))) {
      setError('Montant invalide.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        amount: Number(form.amount),
        currency: form.currency,
        status: form.status,
        paymentMethod: form.paymentMethod,
        taxe: Number(form.taxe) || 0,
        commCommercial: Number(form.commCommercial) || 0,
        moezType: form.moezType,
        moezValeur: Number(form.moezValeur) || 0,
        dueDate: form.dueDate || null,
        paymentDate: form.paymentDate || null,
        purpose: form.purpose,
        comment: form.comment,
        exemptionReason: form.exemptionReason,
        billingAddress: form.billingAddress,
        soldeConfirme: form.soldeConfirme,
      };
      if (mode === 'create') {
        payload.prospectRecordIds = [form.prospect.recordId];
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl scroll-thin">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-strong">
              {mode === 'create' ? 'Nouveau paiement' : 'Modifier le paiement'}
            </h2>
            {paiement?.reference && (
              <p className="text-xs text-text-muted">{paiement.reference}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1 text-sm text-text-muted hover:border-border-strong"
          >
            Fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' ? (
            <Field label="Prospect" required>
              <ProspectPicker
                people={people}
                sources={['Prospect']}
                value={form.prospect ? [form.prospect] : []}
                onChange={(selected) =>
                  setForm((f) => ({ ...f, prospect: selected[selected.length - 1] || null }))
                }
              />
            </Field>
          ) : (
            <div className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm">
              <p className="font-medium text-text-strong">{paiement?.fullName}</p>
              <p className="text-xs text-text-muted">{paiement?.prospectId}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant" required>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.amount}
                onChange={set('amount')}
                placeholder="0.00"
              />
            </Field>
            <Field label="Devise">
              <select className={inputClass} value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inputClass} value={form.status} onChange={set('status')}>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Méthode de paiement">
              <input
                className={inputClass}
                value={form.paymentMethod}
                onChange={set('paymentMethod')}
                placeholder="Virement, carte…"
              />
            </Field>
            <Field label="Taxe %">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.taxe}
                onChange={set('taxe')}
                placeholder="0"
              />
            </Field>
            <Field label="Commission Commercial">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.commCommercial}
                onChange={set('commCommercial')}
                placeholder="0"
              />
            </Field>
            <Field label="Commission Moez — Type">
              <select className={inputClass} value={form.moezType} onChange={set('moezType')}>
                {MOEZ_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commission Moez — Valeur">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.moezValeur}
                onChange={set('moezValeur')}
                placeholder="0"
                disabled={form.moezType === 'Aucune'}
              />
            </Field>
            <Field label="Date d'échéance">
              <input
                type="date"
                className={inputClass}
                value={form.dueDate || ''}
                onChange={set('dueDate')}
              />
            </Field>
            <Field label="Date de paiement">
              <input
                type="date"
                className={inputClass}
                value={form.paymentDate || ''}
                onChange={set('paymentDate')}
              />
            </Field>
          </div>

          <Field label="Purpose">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-canvas px-2.5 py-2">
              {purposeChoices.map((label) => {
                const active = form.purpose.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => togglePurpose(label)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-transparent bg-brand text-white'
                        : 'border-border bg-surface text-text-strong hover:border-border-strong'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>

          {form.status === 'Exonéré' && (
            <Field label="Raison d'exonération">
              <textarea
                rows={2}
                className={inputClass}
                value={form.exemptionReason}
                onChange={set('exemptionReason')}
              />
            </Field>
          )}

          <Field label="Adresse de facturation">
            <input
              className={inputClass}
              value={form.billingAddress}
              onChange={set('billingAddress')}
            />
          </Field>

          <Field label="Commentaire">
            <textarea
              rows={3}
              className={inputClass}
              value={form.comment}
              onChange={set('comment')}
              placeholder="Notes internes…"
            />
          </Field>

          <label className="flex items-center gap-2.5 rounded-xl border border-border bg-canvas px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.soldeConfirme}
              onChange={setChecked('soldeConfirme')}
              className="h-4 w-4 rounded border-border-strong accent-current"
            />
            <span className="text-sm text-text-strong">
              Solde confirmé — paiement validé et encaissé définitivement
            </span>
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : mode === 'create' ? 'Créer le paiement' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
