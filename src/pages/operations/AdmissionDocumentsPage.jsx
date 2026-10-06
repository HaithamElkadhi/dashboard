import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { fetchProspectsForSearch } from '../../lib/airtable.js';
import { ADMISSION_DOCUMENTS } from '../../lib/admissionDocuments.js';

const button = 'min-h-11 rounded-lg border border-border px-4 py-2 text-sm text-navy disabled:opacity-50';
const card = 'rounded-xl border border-border bg-surface p-5';
async function api(studentId, body) {
  const response = await fetch('/api/admission-documents?studentId=' + encodeURIComponent(studentId), body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, ...body }) } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load admission documents.');
  return data;
}
export default function AdmissionDocumentsPage() {
  const { canWrite } = useAuth();
  const [students, setStudents] = useState([]), [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState(''), [data, setData] = useState(null);
  const [selected, setSelected] = useState([]), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [searchError, setSearchError] = useState(''), [success, setSuccess] = useState('');
  const generation = useRef(0);
  const search = async () => { try { setSearchError(''); setStudents(await fetchProspectsForSearch()); } catch (err) { setSearchError(err.message); } };
  useEffect(() => { search(); return () => { generation.current++; }; }, []);
  const load = async id => {
    const current = ++generation.current;
    setStudentId(id); setData(null); setSelected([]); setError(''); setSuccess(''); setLoading(true);
    try { const result = await api(id); if (generation.current === current) setData(result); }
    catch (err) { if (generation.current === current) setError(err.message); }
    finally { if (generation.current === current) setLoading(false); }
  };
  const add = async () => {
    if (!canWrite || busy || !data || !selected.length) return;
    setBusy(true); setError(''); setSuccess(''); const current = generation.current;
    try { const result = await api(studentId, { documentIds: selected, expected: data.requested }); if (current === generation.current) { setData(result); setSelected([]); setSuccess('Requested documents updated in Airtable.'); } }
    catch (err) { if (current === generation.current) setError(err.message); }
    finally { setBusy(false); }
  };
  const requested = new Set((data?.requested || '').split(/\r?\n/).map(line => line.trim()));
  const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matches = students.filter(student => fold(`${student.fullName} ${student.email}`).includes(fold(query.trim())));
  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
    <Link className="text-sm text-navy hover:underline" to="/operations">← Operations</Link>
    <div><h1 className="text-2xl font-semibold text-navy">Admission documents</h1><p className="mt-2 text-sm text-text-muted">Select a prospect and add documents to their requested list.</p></div>
    <section className={card}><h2 className="mb-3 font-semibold text-navy">Select a prospect</h2><input disabled={busy} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search prospects" placeholder="Search by name or email…" className="min-h-11 w-full rounded-lg border border-border px-3 text-sm" />
      {searchError && <p role="alert" className="mt-3 text-sm text-red-700">{searchError} <button className="underline" onClick={search}>Retry</button></p>}
      <div className="mt-3 max-h-48 divide-y divide-border overflow-y-auto">{matches.slice(0, 40).map(student => <button key={student.id} disabled={busy} onClick={() => { if (!selected.length || window.confirm('Discard document selection?')) load(student.id); }} className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas ${studentId === student.id ? 'bg-blue-50 text-navy' : ''}`}><strong className="block font-medium">{student.fullName}</strong><span className="text-xs text-text-muted">{student.email}</span></button>)}</div>
      {matches.length > 40 && <p className="mt-2 text-xs text-text-muted">Refine your search to find more prospects.</p>}
    </section>
    {loading && <p role="status" className="text-sm text-text-muted">Loading requested documents…</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error} {studentId && <button disabled={busy} className="underline" onClick={() => load(studentId)}>Refresh</button>}</p>}
    {data && <><h2 className="text-xl font-semibold text-navy">{data.student.fullName}</h2><div className="grid items-start gap-5 lg:grid-cols-2">
      <section className={card}><h3 className="font-semibold text-navy">Available admission documents</h3><p className="mt-2 text-xs text-text-muted">Select the documents relevant to this prospect. Existing requests are preserved.</p>
        <fieldset disabled={!canWrite || busy} className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-2">{[['general', 'Identity and general documents'], ['academic', 'Academic documents'], ['experience', 'Experience documents']].map(([category, label]) => <div key={category}><h4 className="mb-2 text-sm font-medium text-navy">{label}</h4>{ADMISSION_DOCUMENTS.filter(doc => doc.category === category).map(doc => <label key={doc.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 text-sm hover:bg-canvas"><input type="checkbox" className="mt-1" disabled={requested.has(doc.name)} checked={requested.has(doc.name) || selected.includes(doc.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, doc.id] : previous.filter(id => id !== doc.id))} /><span>{doc.name}{requested.has(doc.name) && <span className="ml-2 text-xs text-text-muted">Already requested</span>}</span></label>)}</div>)}</fieldset>
        {canWrite ? <button data-write="" disabled={busy || !selected.length} onClick={add} className="mt-4 min-h-11 w-full rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Adding…' : `Add${selected.length ? ` (${selected.length})` : ''}`}</button> : <p className="mt-4 text-sm text-text-muted">View access — consultation only.</p>}
      </section>
      <section className={card}><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-navy">Documents demandés</h3><button disabled={busy} className={button} onClick={() => { if (!selected.length || window.confirm('Discard document selection?')) load(studentId); }}>Refresh</button></div><p className="mt-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-text-strong">{data.requested || 'No documents requested yet.'}</p></section>
    </div></>}
    {success && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{success}</p>}
  </div>;
}
