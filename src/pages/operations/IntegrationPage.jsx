import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { fetchProspectsForSearch } from '../../lib/airtable.js';
import { HOUSING_TYPES, INTEGRATION_STEPS, integrationInput, integrationApi, integrationComplete } from '../../lib/integration.js';
const control = 'mt-2 min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:border-navy disabled:bg-canvas';
const secondary = 'min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50';
const done = integrationComplete;
const badge = (step, definition) => definition.statuses.length ? step.status : definition.name === 'Housing' ? step.housingType || 'Not specified' : step.notes ? 'Comment added' : 'No comment';
function StatusChip({ step, definition }) {
  const finished = done(step, definition), searching = definition.name === 'Housing' && step.housingType === 'Searching';
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${finished ? 'bg-green-100 text-green-800' : searching ? 'bg-amber-50 text-amber-800' : 'bg-canvas text-text-muted'}`}>{finished && <span aria-hidden="true">✓</span>}{badge(step, definition)}</span>;
}
function Detail({ original, definition, canWrite, busy, save, dirtyRef }) {
  const [form, setForm] = useState(() => integrationInput(original));
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(integrationInput(original));
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const change = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setError(''); setSuccess(''); };
  const submit = async event => { event.preventDefault(); if (busy || !canWrite || !dirty) return; setError(''); setSuccess(''); try { await save(original, form); setSuccess('Changes saved.'); dirtyRef.current = false; } catch (err) { setError(err.message); } };
  useEffect(() => { setForm(integrationInput(original)); }, [original]);
  return <section className="min-w-0 rounded-xl border border-border bg-surface p-5 sm:p-6" aria-label={`${definition.title} details`}>
    <div className="border-b border-border pb-5"><p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Integration step</p><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-navy">{definition.title}</h2><StatusChip step={original} definition={definition} /></div><p className="mt-2 text-sm text-text-muted">{definition.name === 'ISEE / ISEEU' ? 'Keep the information and follow-up for this student here.' : definition.name === 'Housing' ? 'Choose the student’s accommodation and add a comment.' : 'Update this step and keep a comment for the team.'}</p></div>
    <form onSubmit={submit} className="mt-5"><fieldset disabled={busy || !canWrite} className="space-y-5">
      {!!definition.statuses.length && <label className="block text-sm font-medium text-text-strong">Status<select className={control} value={form.status} onChange={event => change('status', event.target.value)}>{definition.statuses.map(status => <option key={status}>{status}</option>)}</select></label>}
      {definition.fields.includes('housingType') && <label className="block text-sm font-medium text-text-strong">Accommodation type<select className={control} value={form.housingType} onChange={event => change('housingType', event.target.value)}><option value="">Select accommodation…</option>{HOUSING_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>}
      {definition.fields.includes('link') && <label className="block text-sm font-medium text-text-strong">Referral link<input type="url" className={control} maxLength={2000} value={form.link} placeholder="https://…" onChange={event => change('link', event.target.value)} /></label>}
      {definition.fields.includes('completedDate') && <label className="block text-sm font-medium text-text-strong">{definition.dateLabel}<input type="date" className={control} value={form.completedDate} onChange={event => change('completedDate', event.target.value)} /><span className="mt-2 block text-xs font-normal text-text-muted">If left empty, the sending date defaults to today when saved as sent.</span></label>}
      <label className="block text-sm font-medium text-text-strong">Comment<textarea className={control} rows={6} maxLength={5000} value={form.notes} placeholder="Add information for the team…" onChange={event => change('notes', event.target.value)} /></label>
      {canWrite && <div className="flex justify-end gap-2 border-t border-border pt-5"><button type="button" className={secondary} disabled={!dirty} onClick={() => { setForm(integrationInput(original)); setError(''); }}>Reset</button><button data-write="" disabled={!dirty || busy} className="min-h-11 rounded-lg bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button></div>}
    </fieldset></form>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{success}</p>}
    {definition.fields.includes('link') && /^https?:\/\//i.test(original.link) && <a href={original.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-navy underline">Open referral link ↗</a>}
    {original.updatedAt && <p className="mt-5 text-xs text-text-muted">Updated {new Date(original.updatedAt).toLocaleString('en-GB')} · {original.updatedBy}</p>}
    {original.history && <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium text-navy">History</summary><p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-xs text-text-muted">{original.history}</p></details>}
  </section>;
}
export default function IntegrationPage() {
  const { canWrite } = useAuth(); const [params, setParams] = useSearchParams(); const studentId = params.get('student') || '';
  const [students, setStudents] = useState([]), [query, setQuery] = useState(''), [searchError, setSearchError] = useState(''), [picking, setPicking] = useState(!studentId);
  const [data, setData] = useState(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [active, setActive] = useState(0);
  const dirty = useRef(false), generation = useRef(0);
  const search = async () => { setSearchError(''); try { setStudents(await fetchProspectsForSearch()); } catch (err) { setSearchError(err.message); } };
  useEffect(() => { search(); }, []);
  const load = async () => { if (!studentId) return; const current = ++generation.current; setLoading(true); setError(''); try { const result = await integrationApi(studentId); if (current === generation.current) setData(result); } catch (err) { if (current === generation.current) setError(err.message); } finally { if (current === generation.current) setLoading(false); } };
  useEffect(() => { setData(null); dirty.current = false; setActive(0); load(); return () => { generation.current++; }; }, [studentId]);
  useEffect(() => { const warn = event => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, []);
  const discard = () => !dirty.current || window.confirm('Discard unsaved changes?');
  const save = async (original, input) => { setBusy(true); const current = generation.current; try { const result = await integrationApi(studentId, { step: original.step, input, expected: original }); if (current === generation.current) setData(previous => ({ ...previous, steps: previous.steps.map(step => step.step === result.step.step ? result.step : step) })); } finally { setBusy(false); } };
  const chooseStep = index => { if (!busy && !loading && (index === active || discard())) setActive(index); };
  const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matches = students.filter(student => fold(`${student.fullName} ${student.email}`).includes(fold(query.trim())));
  const completed = data?.steps.filter((step, index) => INTEGRATION_STEPS[index].statuses.length && done(step, INTEGRATION_STEPS[index])).length || 0;
  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
    <Link to="/operations" onClick={event => { if (!discard()) event.preventDefault(); }} className="text-sm text-navy hover:underline">← Operations</Link>
    <div><h1 className="text-2xl font-semibold text-navy">Integration</h1><p className="mt-2 text-sm text-text-muted">One student. Each step in one place.</p></div>
    {(picking || !studentId) && <section className="rounded-xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><label htmlFor="integration-search" className="text-sm font-medium text-navy">Select a student</label>{data && <button className={secondary} onClick={() => setPicking(false)}>Cancel</button>}</div><input id="integration-search" disabled={busy} className={control} placeholder="Search by name or email…" value={query} onChange={event => setQuery(event.target.value)} />
      {searchError && <p role="alert" className="mt-3 text-sm text-red-700">{searchError} <button className="underline" onClick={search}>Retry</button></p>}
      <div className="mt-3 max-h-48 divide-y divide-border overflow-y-auto">{matches.slice(0,40).map(student => <button key={student.id} disabled={busy} onClick={() => { if (student.id === studentId || discard()) { setParams({ student: student.id }); setPicking(false); setQuery(''); } }} className="block min-h-11 w-full rounded-lg p-3 text-left text-sm hover:bg-canvas"><strong className="block font-medium">{student.fullName}</strong><span className="text-xs text-text-muted">{student.email}</span></button>)}</div>{matches.length > 40 && <p className="mt-2 text-xs text-text-muted">Refine your search to find more students.</p>}
    </section>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error} <button disabled={busy} className="underline" onClick={() => { if(discard()) load(); }}>Retry</button></p>}
    {loading && <p role="status" className="text-sm text-text-muted">Loading integration…</p>}
    {data && <><section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5"><div><h2 className="text-lg font-semibold text-navy">{data.student.fullName}</h2><p className="mt-1 text-sm text-text-muted">{data.student.email}</p><p className="mt-2 text-xs text-text-muted">{completed} / 5 workflows completed · ISEE and Housing tracked separately</p></div><div className="flex gap-2"><button className={secondary} disabled={busy} onClick={() => setPicking(true)}>Change student</button><button className={secondary} disabled={busy || loading} onClick={() => { if (discard()) load(); }}>Refresh</button></div></section>
      {!canWrite && <p className="text-sm text-text-muted">View access — consultation only.</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><nav aria-label="Integration steps" className="hidden overflow-hidden rounded-xl border border-border bg-surface lg:block">{data.steps.map((step,index) => { const definition = INTEGRATION_STEPS[index], finished = done(step,definition); return <button key={step.step} disabled={busy || loading} aria-current={index === active ? 'step' : undefined} onClick={() => chooseStep(index)} className={`flex min-h-20 w-full items-center gap-3 border-b border-border px-4 py-4 text-left last:border-0 disabled:opacity-60 ${index === active ? 'bg-blue-50 ring-1 ring-inset ring-navy/20' : 'hover:bg-canvas'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${finished ? 'bg-green-100 text-green-800' : 'bg-canvas text-navy'}`}>{finished ? '✓' : index+1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-navy">{definition.title}</span><span className="mt-2 block"><StatusChip step={step} definition={definition} /></span></span><span className="text-navy">›</span></button>; })}</nav>
      <div className="min-w-0 space-y-4"><label className="block text-sm font-medium text-navy lg:hidden">Step<select className={control} disabled={busy || loading} value={active} onChange={event => chooseStep(Number(event.target.value))}>{data.steps.map((step,index) => <option key={step.step} value={index}>{INTEGRATION_STEPS[index].title} · {badge(step,INTEGRATION_STEPS[index])}</option>)}</select></label><Detail key={`${studentId}-${active}`} original={data.steps[active]} definition={INTEGRATION_STEPS[active]} canWrite={canWrite} busy={busy || loading} save={save} dirtyRef={dirty} /></div>
      </div>
    </>}
  </div>;
}
