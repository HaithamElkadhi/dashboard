import { CURRENCY_LABELS, DOC_CURRENCIES, PAYMENT_METHOD_LABELS } from '../../../lib/financeDocs/constants.js';
import { Field, Section, inputClass } from './fields.jsx';

export default function ReceiptForm({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <Section title="Reçu">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Référence">
            <input data-write="" value={data.invoiceId} onChange={set('invoiceId')} className={inputClass} />
          </Field>
          <Field label="Date de paiement">
            <input data-write="" type="date" value={data.paymentDate} onChange={set('paymentDate')} className={inputClass} />
          </Field>
        </div>
        <Field label="Objet">
          <input data-write="" value={data.paymentReason} onChange={set('paymentReason')} className={inputClass} />
        </Field>
      </Section>

      <Section title="Client">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet">
            <input data-write="" value={data.clientName} onChange={set('clientName')} className={inputClass} />
          </Field>
          <Field label="Email">
            <input data-write="" type="email" value={data.clientEmail} onChange={set('clientEmail')} className={inputClass} />
          </Field>
          <Field label="Téléphone">
            <input data-write="" value={data.clientPhone} onChange={set('clientPhone')} className={inputClass} />
          </Field>
        </div>
        <Field label="Adresse">
          <textarea data-write=""
            rows={2}
            value={data.clientAddress}
            onChange={set('clientAddress')}
            className={`${inputClass} h-auto py-2`}
          />
        </Field>
      </Section>

      <Section title="Paiement">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Montant">
            <input data-write=""
              type="number"
              min="0"
              step="0.01"
              value={data.amount}
              onChange={(e) => onChange({ ...data, amount: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </Field>
          <Field label="Devise">
            <select data-write="" value={data.currency} onChange={set('currency')} className={inputClass}>
              {DOC_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Moyen de paiement">
            <select data-write="" value={data.paymentMethod} onChange={set('paymentMethod')} className={inputClass}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Commentaire">
          <textarea data-write=""
            rows={3}
            value={data.comment}
            onChange={set('comment')}
            className={`${inputClass} h-auto py-2`}
          />
        </Field>
      </Section>
    </div>
  );
}
