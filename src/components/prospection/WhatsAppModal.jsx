import { useState } from 'react';
import Modal from '../Modal.jsx';
import { WhatsAppIcon } from '../icons.jsx';
import { emptyLead, whatsappUrl } from '../../lib/prospection.js';
import { actionClasses, buttonClass, ErrorMessage, Field, inputClass, prospectionApi } from './controls.jsx';

export default function WhatsAppModal({ lead, canWrite, onClose, onSaved }) {
  const [number, setNumber] = useState(lead.phone || '');
  const [saveNumber, setSaveNumber] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const url = whatsappUrl(number);
  const changed = number.trim() !== (lead.phone || '').trim();
  const close = () => { if (!busy) onClose(); };
  const continueToWhatsApp = async event => {
    event.preventDefault();
    if (!url || busy) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (canWrite && saveNumber && changed) {
      setBusy(true); setError('');
      try {
        const input = { ...emptyLead(), ...lead, lastName: lead.lastName || (!lead.firstName ? lead.name : ''), phone: number.trim() };
        const result = await prospectionApi({ action: 'save', id: lead.id, input });
        onSaved(result.lead);
      } catch (err) { setError(err.message || 'Le numéro n’a pas pu être enregistré.'); setBusy(false); return; }
    }
    onClose();
  };
  return <Modal title={`WhatsApp — ${lead.name}`} subtitle="Vérifiez le numéro avant d’ouvrir la conversation." size="sm" onClose={close}>
    <form onSubmit={continueToWhatsApp} className="space-y-4">
      <Field label="Numéro WhatsApp"><input type="tel" className={inputClass} value={number} readOnly={!canWrite} disabled={busy} maxLength={60} placeholder="+216 90 704 420" onChange={event => { setNumber(event.target.value); setError(''); }} /></Field>
      <p className="text-xs text-text-muted">{url ? `Ouvrira ${url}` : 'Indiquez un numéro valide avec son indicatif pays.'}</p>
      {canWrite && changed && url && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveNumber} disabled={busy} onChange={event => setSaveNumber(event.target.checked)} />Enregistrer ce numéro comme téléphone du lead</label>}
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={close}>Annuler</button><button className={`${actionClasses.whatsapp} gap-2`} disabled={busy || !url}><WhatsAppIcon size={15} />{busy ? 'Enregistrement…' : 'Continuer'}</button></div>
    </form>
  </Modal>;
}
