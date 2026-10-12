import { useEffect, useState } from 'react';
import Modal from '../Modal.jsx';
import { INTERESTS } from '../../lib/prospection.js';
import { Field, ErrorMessage, inputClass, primaryClass, prospectionApi } from './controls.jsx';

const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function ActivityModal({ lead, canWrite, onClose, onSaved }) {
  const [calls, setCalls] = useState([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({ date: localNow(), channel: 'Phone', interest: lead.interest, comment: '' });
  const set = field => event => setForm(value => ({ ...value, [field]: event.target.value }));
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError('');
    fetch(`/api/prospection?leadId=${lead.id}`, { signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => setCalls(data.calls)).catch(err => { if (!controller.signal.aborted) setLoadError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [lead.id, retry]);
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const result = await prospectionApi({ action: 'call', id: lead.id, key, ...form, date: new Date(form.date).toISOString() });
      onSaved(result.lead); setRetry(value => value + 1);
      if (result.warning) setError(result.warning);
      else { setKey(crypto.randomUUID()); setForm(value => ({ ...value, comment: '', date: localNow() })); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title={`Activité — ${lead.name}`} onClose={() => { if (!busy) onClose(); }} size="lg">
    <div className="space-y-6">
      {canWrite && <form onSubmit={save} className="space-y-3">
        <h3 className="font-semibold text-text-strong">Ajouter un appel</h3>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
          <Field label="Date et heure"><input required type="datetime-local" className={inputClass} value={form.date} onChange={set('date')} /></Field>
          <Field label="Canal"><select className={inputClass} value={form.channel} onChange={set('channel')}><option value="Phone">Téléphone</option><option value="WhatsApp">WhatsApp</option></select></Field>
          <Field label="Résultat / intérêt"><select className={inputClass} value={form.interest} onChange={set('interest')}>{INTERESTS.map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Commentaire"><textarea rows={2} className={inputClass} value={form.comment} onChange={set('comment')} maxLength={5000} /></Field>
        </fieldset>
        <ErrorMessage>{error}</ErrorMessage>
        <button className={primaryClass} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer l’appel'}</button>
      </form>}
      <section className="space-y-3"><h3 className="font-semibold text-text-strong">Historique des appels</h3>
        {loading ? <p role="status" className="text-sm text-text-muted">Chargement…</p> : loadError ? <div><ErrorMessage>{loadError}</ErrorMessage><button className="mt-2 underline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></div> : !calls.length ? <p className="text-sm text-text-muted">Aucun appel enregistré dans ce module.</p> : <ol className="space-y-3">{calls.map(call => <li key={call.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-medium text-text-strong">{new Date(call.date).toLocaleString('fr-FR')} · {call.channel === 'Phone' ? 'Téléphone' : call.channel} · {call.interest}</p><p className="mt-1 text-xs text-text-muted">{call.author}</p>{call.comment && <p className="mt-2 whitespace-pre-wrap break-words">{call.comment}</p>}</li>)}</ol>}
      </section>
    </div>
  </Modal>;
}
