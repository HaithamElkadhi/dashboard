import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { notesApi, noteInput, blankNote } from '../lib/notes.js';

const button = 'min-h-11 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50';
function NoteEditor({ note, canWrite, onSave, onClose }) {
  const [form, setForm] = useState(() => note ? noteInput(note) : blankNote());
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const baseline = note ? noteInput(note) : blankNote();
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useEffect(() => { if (note) setForm(noteInput(note)); }, [note]);
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const change = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setSaved(false); setError(''); };
  const close = () => { if (!busy && (!dirty || window.confirm('Discard unsaved changes?'))) onClose(); };
  const submit = async event => {
    event.preventDefault(); if (busy || !canWrite) return;
    setBusy(true); setError('');
    try { await onSave({ action: 'save', input: form, ...(note ? { id: note.id, expected: note } : {}) }); setSaved(true); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="min-w-0 rounded-xl border border-border bg-white">
    <div className="flex items-center justify-end gap-3 border-b border-border px-5 py-3">
      {saved && <span role="status" className="text-sm text-green-700">Saved</span>}
      <button className={button} disabled={busy} onClick={close}>Close</button>
      {canWrite && <button data-write="" form="plain-note" type="submit" disabled={busy || !dirty} className="min-h-11 rounded-lg bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>}
    </div>
    <form id="plain-note" onSubmit={submit} className="p-6 sm:p-10">
      <fieldset disabled={busy || !canWrite}>
        <input aria-label="Title" required maxLength={200} placeholder="Title" value={form.title} onChange={event => change('title', event.target.value)} className="w-full border-0 bg-transparent py-3 text-2xl font-semibold text-navy outline-none placeholder:text-text-muted focus-visible:ring-1 focus-visible:ring-border" />
        <textarea aria-label="Note" required maxLength={20000} placeholder="Write your note…" value={form.content} onChange={event => change('content', event.target.value)} className="mt-4 min-h-[60vh] w-full resize-y border-0 bg-transparent py-2 text-base leading-8 text-text-strong outline-none placeholder:text-text-muted focus-visible:ring-1 focus-visible:ring-border" />
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </form>
  </section>;
}
export default function NotesPage() {
  const { canWrite } = useAuth(); const [params, setParams] = useSearchParams();
  const [notes, setNotes] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [creating, setCreating] = useState(false);
  const generation = useRef(0);
  const load = async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const result = await notesApi(); if (current === generation.current) setNotes(result.notes); }
    catch (err) { if (current === generation.current) setError(err.message); }
    finally { if (current === generation.current) setLoading(false); }
  };
  useEffect(() => { load(); return () => { generation.current++; }; }, []);
  const selected = notes.find(note => note.id === params.get('note'));
  const save = async body => { const result = await notesApi(body); setNotes(prev => [result.note, ...prev.filter(note => note.id !== result.note.id)]); setCreating(false); setParams({ note: result.note.id }); };
  const close = () => { setCreating(false); setParams({}); };
  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold text-navy">Notes</h1>{canWrite && !selected && !creating && <button data-write="" className={button} onClick={() => setCreating(true)}>+ New note</button>}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button onClick={load} className="underline">Retry</button></p>}
    {selected || creating ? <NoteEditor key={selected?.id || 'new'} note={selected} canWrite={canWrite} onSave={save} onClose={close} /> : loading ? <p className="text-sm text-text-muted">Loading…</p> : <div className="divide-y divide-border rounded-xl border border-border bg-white">{notes.map(note => <button key={note.id} className="block min-h-14 w-full px-6 py-5 text-left font-medium text-navy hover:bg-canvas" onClick={() => setParams({ note: note.id })}>{note.title}</button>)}{!notes.length && <p className="p-8 text-sm text-text-muted">No notes yet.</p>}</div>}
    {params.get('note') && !selected && !loading && <p className="text-sm text-text-muted">Note unavailable. <button className="underline" onClick={close}>Close</button></p>}
  </div>;
}
