import { useState } from 'react';
import Modal from '../Modal.jsx';
import { emptyLead, INTERESTS, leadError } from '../../lib/prospection.js';
import { Field, ErrorMessage, inputClass, buttonClass, primaryClass, prospectionApi } from './controls.jsx';

export default function LeadModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState(() => lead ? { ...emptyLead(), ...lead, lastName: lead.lastName || (!lead.firstName ? lead.name : '') } : emptyLead());
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = key => event => setForm(value => ({ ...value, [key]: event.target.value }));
  const close = () => { if (!busy) onClose(); };
  async function save(event) {
    event.preventDefault(); if (busy) return;
    const invalid = leadError(form); if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try { const result = await prospectionApi({ action: 'save', id: lead?.id, input: form }); onSaved(result.lead); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title={lead ? 'Modifier le lead' : 'Ajouter un lead'} onClose={close}>
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom"><input className={inputClass} value={form.lastName} onChange={set('lastName')} maxLength={150} autoComplete="family-name" /></Field>
        <Field label="Prénom"><input className={inputClass} value={form.firstName} onChange={set('firstName')} maxLength={150} autoComplete="given-name" /></Field>
        <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={set('email')} maxLength={254} /></Field>
        <Field label="Téléphone / WhatsApp"><input type="tel" className={inputClass} value={form.phone} onChange={set('phone')} maxLength={60} placeholder="+216… ou +39…" /></Field>
        <Field label="Source"><input className={inputClass} value={form.source} onChange={set('source')} maxLength={200} placeholder="Facebook, salon, recommandation…" /></Field>
        <Field label="Intérêt"><select className={inputClass} value={form.interest} onChange={set('interest')}>{INTERESTS.map(value => <option key={value}>{value}</option>)}</select></Field>
      </fieldset>
      <p className="text-xs text-text-muted">Un nom ou un prénom est requis. Pour WhatsApp, indiquez le numéro avec son indicatif pays.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2"><button type="button" className={buttonClass} onClick={close} disabled={busy}>Annuler</button><button className={primaryClass} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  </Modal>;
}
