import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal.jsx';
import { Field, ErrorMessage, inputClass, buttonClass, primaryClass, prospectionApi } from './controls.jsx';

export default function EmailModal({ lead, onClose }) {
  const [senders, setSenders] = useState([]), [fromKey, setFromKey] = useState('');
  const [subject, setSubject] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [sent, setSent] = useState(false), [error, setError] = useState('');
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/prospection?senders=1', { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Impossible de charger les expéditeurs.');
        setSenders(result.senders); setFromKey(result.senders[0]?.key || '');
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, []);
  const change = setter => event => { setter(event.target.value); key.current = crypto.randomUUID(); };
  const close = () => { if (!busy && (sent || !subject && !message || window.confirm('Abandonner cet email non envoyé ?'))) onClose(); };
  const send = async event => {
    event.preventDefault(); if (busy || sent) return;
    setBusy(true); setError('');
    try { await prospectionApi({ action: 'email', id: lead.id, fromKey, subject, message, key: key.current }); setSent(true); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title={`Envoyer un email — ${lead.name}`} onClose={close}>
    {sent ? <div className="space-y-4"><p role="status">Email envoyé à {lead.email}.</p><button className={buttonClass} onClick={onClose}>Fermer</button></div> : <form onSubmit={send} className="space-y-4">
      <p className="break-words text-sm">Destinataire : <strong>{lead.email || 'Adresse manquante — renseignez-la dans Modifier.'}</strong></p>
      <fieldset disabled={busy || loading} className="space-y-4">
        <Field label="Expéditeur"><select required className={inputClass} value={fromKey} onChange={change(setFromKey)}><option value="">{loading ? 'Chargement…' : 'Choisir une adresse'}</option>{senders.map(sender => <option key={sender.key} value={sender.key}>{sender.address}</option>)}</select></Field>
        <Field label="Objet"><input required maxLength={200} className={inputClass} value={subject} onChange={change(setSubject)} /></Field>
        <Field label="Corps du message"><textarea required rows={8} maxLength={20000} className={inputClass} value={message} onChange={change(setMessage)} /></Field>
      </fieldset>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={close}>Annuler</button><button className={primaryClass} disabled={busy || loading || !fromKey || !lead.email}>{busy ? 'Envoi…' : 'Envoyer l’email'}</button></div>
    </form>}
  </Modal>;
}
