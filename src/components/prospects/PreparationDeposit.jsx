import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const control = 'min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:border-navy disabled:opacity-50';
export default function PreparationDeposit({ studentId, onUpdated }) {
  const { canWrite } = useAuth();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({ done: false, note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setSaved(null);
    setError('');
    setSuccess(false);
    fetch('/api/admission-documents?' + new URLSearchParams({ studentId, preparation: '1' }), { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Chargement impossible.');
        if (!controller.signal.aborted) { setSaved(result.deposit); setForm(result.deposit); }
      }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [studentId, revision]);
  const dirty = saved && ['done', 'note'].some(key => form[key] !== saved[key]);
  function change(key, value) { setForm(previous => ({ ...previous, [key]: value })); setSuccess(false); }
  async function save(event) {
    event.preventDefault();
    if (!canWrite || busy || !saved || !dirty) return;
    setBusy(true); setError(''); setSuccess(false);
    try {
      const response = await fetch('/api/admission-documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-deposit', studentId, input: form, expected: saved }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Enregistrement non confirmé.');
      setSaved(result.deposit); setForm(result.deposit); setSuccess(true); onUpdated?.();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="relative flex items-start gap-3">
    <span aria-hidden="true" className={'relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ' + (saved?.done ? 'bg-emerald-600 text-white' : 'bg-[#E8F4FB] text-[#173B65]')}>7</span>
    <div className="min-w-0 flex-1 rounded-xl border border-border p-3">
      <h3 className="text-sm font-semibold text-text-strong">Dépôt du dossier</h3>
      {!saved && !error && <p role="status" className="mt-2 text-sm text-text-muted">Chargement du suivi…</p>}
      {saved && <form onSubmit={save} className="mt-3">
        <fieldset disabled={!canWrite || busy} className="space-y-3">
          <label className="block space-y-1 text-sm"><span>Statut</span><select className={control} value={String(form.done)} onChange={event => change('done', event.target.value === 'true')}>
            <option value="false">Non fait</option><option value="true">Fait</option>
          </select></label>
          <label className="block space-y-1 text-sm"><span>Note de suivi</span><textarea className={control} rows={3} maxLength={2000} value={form.note} onChange={event => change('note', event.target.value)} placeholder="Ex. Dossier déposé au bureau le 19 novembre…" /></label>
          {canWrite && <button type="submit" disabled={!dirty} className="min-h-11 rounded-lg bg-navy px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>}
        </fieldset>
      </form>}
      {success && <p role="status" className="mt-2 text-sm text-emerald-800">Suivi enregistré.</p>}
      {error && <div className="mt-2 text-sm text-red-700"><p role="alert">{error}</p><button type="button" disabled={busy} className="min-h-11 rounded underline" onClick={() => setRevision(value => value + 1)}>Actualiser</button></div>}
    </div>
  </div>;
}
