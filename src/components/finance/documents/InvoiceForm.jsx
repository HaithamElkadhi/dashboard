import { CURRENCY_LABELS, DOC_CURRENCIES, computeInvoiceTotals, formatInvoiceCurrency } from '../../../lib/financeDocs/constants.js';
import { newInvoiceItem } from '../../../lib/financeDocs/fromPaiement.js';
import { PlusIcon, TrashIcon } from '../../icons.jsx';
import { Field, Section, inputClass } from './fields.jsx';

const PAYMENT_METHOD_OPTIONS = [
  { key: 'bankTransferItaly', label: 'Virement — Italie (Intesa Sanpaolo, EUR)' },
  { key: 'bankTransferTunisia', label: 'Virement — Tunisie (ABC Bank, TND)' },
  { key: 'other', label: 'Autre moyen de paiement' },
];

export default function InvoiceForm({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  const setItem = (id, patch) =>
    onChange({ ...data, items: data.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const { subtotal, discountAmount, finalTotal } = computeInvoiceTotals(data);
  const fmt = (n) => formatInvoiceCurrency(n, data.currency);

  return (
    <div className="space-y-4">
      <Section title="Facture">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="N° de facture">
            <input value={data.invoiceNumber} onChange={set('invoiceNumber')} className={inputClass} />
          </Field>
          <Field label="Devise">
            <select value={data.currency} onChange={set('currency')} className={inputClass}>
              {DOC_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={data.date} onChange={set('date')} className={inputClass} />
          </Field>
          <Field label="Échéance">
            <input type="date" value={data.dueDate} onChange={set('dueDate')} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="Client">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet">
            <input value={data.clientName} onChange={set('clientName')} className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={data.clientEmail} onChange={set('clientEmail')} className={inputClass} />
          </Field>
        </div>
        <Field label="Adresse de facturation">
          <textarea
            rows={2}
            value={data.clientAddress}
            onChange={set('clientAddress')}
            className={`${inputClass} h-auto py-2`}
          />
        </Field>
      </Section>

      <Section title="Lignes">
        <div className="space-y-3">
          {data.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_4.5rem_7rem_auto] items-end gap-2">
              <Field label="Description">
                <input
                  value={item.description}
                  onChange={(e) => setItem(item.id, { description: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Qté">
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => setItem(item.id, { quantity: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </Field>
              <Field label="Prix unitaire">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => setItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                aria-label="Supprimer la ligne"
                disabled={data.items.length === 1}
                onClick={() => onChange({ ...data, items: data.items.filter((it) => it.id !== item.id) })}
                className="mb-1 rounded-lg p-2 text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...data, items: [...data.items, newInvoiceItem()] })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-strong transition hover:border-border-strong"
        >
          <PlusIcon size={13} />
          Ajouter une ligne
        </button>
      </Section>

      <Section title="Remise">
        <label className="flex items-center gap-2 text-sm text-text-strong">
          <input
            type="checkbox"
            checked={data.discountEnabled}
            onChange={(e) => onChange({ ...data, discountEnabled: e.target.checked })}
            className="h-4 w-4 accent-current"
          />
          Appliquer une remise
        </label>
        {data.discountEnabled && (
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Field label="Remise (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={data.discountPercentage}
                onChange={(e) =>
                  onChange({ ...data, discountPercentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Motif">
              <input value={data.discountReason} onChange={set('discountReason')} className={inputClass} />
            </Field>
          </div>
        )}
        <dl className="space-y-1 border-t border-border pt-3 text-sm tabular-nums">
          <div className="flex justify-between text-text-muted">
            <dt>Sous-total</dt>
            <dd>{fmt(subtotal)}</dd>
          </div>
          {data.discountEnabled && discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <dt>Remise ({data.discountPercentage}%)</dt>
              <dd>-{fmt(discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between font-semibold text-text-strong">
            <dt>Total</dt>
            <dd>{fmt(finalTotal)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Moyens de paiement">
        {PAYMENT_METHOD_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-sm text-text-strong">
            <input
              type="checkbox"
              checked={data.paymentMethods[opt.key]}
              onChange={(e) =>
                onChange({ ...data, paymentMethods: { ...data.paymentMethods, [opt.key]: e.target.checked } })
              }
              className="h-4 w-4 accent-current"
            />
            {opt.label}
          </label>
        ))}
      </Section>
    </div>
  );
}
