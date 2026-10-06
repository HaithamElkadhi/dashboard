import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePageRefreshRegistration } from '../../contexts/PageRefreshContext.jsx';
import { fetchProspectsForSearch } from '../../lib/airtable.js';
import { applicationsApi, DEGREE_LABELS, newApplication, sameApplication } from '../../lib/applications.js';

const control = 'min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-text-strong outline-none focus:border-navy disabled:opacity-50';
const secondary = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50';
const primary = 'min-h-11 rounded-lg bg-navy px-5 py-2 text-sm font-medium text-white hover:bg-navy-strong disabled:opacity-50';
const card = 'rounded-xl border border-border bg-surface p-5 sm:p-6';
const formatDate = value => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis', dateStyle: 'medium' }).format(new Date(value)) : '—';
const safePortal = value => /^https?:\/\//i.test(value || '') ? value : undefined;
function Field({ label, children }) { return <label className="block space-y-2 text-sm font-medium text-text-strong"><span>{label}</span>{children}</label>; }
function Status({ value }) {
  const colors = { Proposal: 'bg-blue-50 text-blue-800', Submitted: 'bg-cyan-50 text-cyan-800', Admitted: 'bg-green-50 text-green-800', Rejected: 'bg-red-50 text-red-800' };
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[value] || 'bg-canvas text-text-muted'}`}>{value || 'Status not set'}</span>;
}

export default function ApplicationPage() {
  const { user, canWrite } = useAuth();
  const [params, setParams] = useSearchParams();
  const studentId = params.get('student') || '';
  const [students, setStudents] = useState([]), [searchError, setSearchError] = useState(''), [searchLoading, setSearchLoading] = useState(true);
  const [query, setQuery] = useState(''), [picking, setPicking] = useState(!studentId);
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [initial] = useState(newApplication), [form, setForm] = useState(initial);
  const [selected, setSelected] = useState(null);
  const formPanel = useRef(null);
  const baseline = selected ? Object.fromEntries(Object.keys(initial).map(key => [key, selected[key] || ''])) : initial;
  const [busy, setBusy] = useState(false), [saveError, setSaveError] = useState(''), [success, setSuccess] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false), [lastUpdated, setLastUpdated] = useState(null);
  const generation = useRef(0);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const loadStudents = useCallback(async () => {
    setSearchLoading(true); setSearchError('');
    try { setStudents((await fetchProspectsForSearch()).sort((a, b) => a.fullName.localeCompare(b.fullName))); }
    catch (err) { setSearchError(err.message); }
    finally { setSearchLoading(false); }
  }, []);
  useEffect(() => { loadStudents(); }, [loadStudents]);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await applicationsApi(studentId);
      if (generation.current === current) { setData(result); setLastUpdated(new Date()); }
    } catch (err) { if (generation.current === current) { setError(err.message); setData(null); } }
    finally { if (generation.current === current) setLoading(false); }
  }, [studentId]);
  useEffect(() => { setData(null); setSelected(null); setForm(initial); load(); return () => { generation.current += 1; }; }, [load]);
  usePageRefreshRegistration({ lastUpdated, refresh: load, loading });
  useEffect(() => {
    if (!dirty || !canWrite) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, canWrite]);
  const matches = useMemo(() => {
    const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const needle = fold(query.trim());
    return students.filter(student => !needle || fold(`${student.fullName} ${student.email}`).includes(needle));
  }, [students, query]);
  const change = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setConfirmDuplicate(false); setSaveError(''); setSuccess(''); };
  const chooseStudent = student => {
    if (busy || (dirty && student.id !== studentId && !window.confirm('Discard this unsaved application and choose another prospect?'))) return;
    if (student.id !== studentId) { setForm(initial); setSelected(null); setSaveError(''); setSuccess(''); setConfirmDuplicate(false); setParams({ student: student.id }); }
    setPicking(false); setQuery('');
  };
  const duplicates = (data?.applications || []).filter(application => application.id !== selected?.id && sameApplication(application, form));
  const submit = async event => {
    event.preventDefault();
    if (busy || !canWrite || !data?.student || loading) return;
    setBusy(true); setSaveError(''); setSuccess('');
    const current = generation.current;
    try {
      const result = await applicationsApi(studentId, form, confirmDuplicate, selected);
      if (generation.current !== current) return;
      setData(previous => ({ ...previous, applications: [result.application, ...previous.applications.filter(application => application.id !== result.application.id)] }));
      if (selected) { setSelected(result.application); setForm(Object.fromEntries(Object.keys(initial).map(key => [key, result.application[key] || '']))); } else setForm(initial);
      setConfirmDuplicate(false); setLastUpdated(new Date());
      setSuccess(selected ? "Application changes saved." : `Application recorded for ${data.student.fullName}. Submitted by ${result.application.submittedBy}.`);
    } catch (err) { if (generation.current === current) setSaveError(err.message); }
    finally { setBusy(false); }
  };
  const selectApplication = application => {
    if (busy || loading || (canWrite && dirty && !window.confirm('Discard unsaved changes?'))) return;
    setSelected(application); setForm(Object.fromEntries(Object.keys(initial).map(key => [key, application[key] || ''])));
    setConfirmDuplicate(false); setSaveError(''); setSuccess('');
    if (window.innerWidth < 1024 && canWrite) formPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const startNew = () => {
    if (busy || (dirty && !window.confirm('Discard unsaved changes?'))) return;
    setSelected(null); setForm(initial); setConfirmDuplicate(false); setSaveError(''); setSuccess('');
  };
  const options = (key, labels = {}) => <select className={control} required value={form[key]} onChange={event => change(key, event.target.value)}><option value="">Select…</option>{data?.choices?.[key]?.map(value => <option key={value} value={value}>{labels[value] || value}</option>)}</select>;

  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
    <Link to="/operations" onClick={event => { if (dirty && !window.confirm('Discard this unsaved application?')) event.preventDefault(); }} className="text-sm text-navy hover:underline">← Operations</Link>
    <div><h1 className="text-2xl font-semibold text-navy">Application</h1><p className="mt-2 text-sm text-text-muted">Record university applications and follow each prospect’s existing candidatures.</p></div>
    {(picking || !studentId) && <section className={card} aria-label="Select prospect">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-navy">1. Select a prospect</h2>{studentId && <button className={secondary} onClick={() => setPicking(false)}>Cancel</button>}</div>
      <input className={control} aria-label="Search prospects" placeholder="Search by name or email…" value={query} onChange={event => setQuery(event.target.value)} disabled={busy} />
      {searchLoading ? <p className="mt-4 text-sm text-text-muted">Loading prospects…</p> : searchError ? <p role="alert" className="mt-4 text-sm text-red-700">{searchError} <button onClick={loadStudents} className="underline">Retry</button></p> : <>
        <div className="mt-4 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">{matches.slice(0, 40).map(student => <button key={student.id} disabled={busy} className="block min-h-11 w-full px-4 py-3 text-left hover:bg-canvas" onClick={() => chooseStudent(student)}><span className="block text-sm font-medium text-navy">{student.fullName}</span><span className="block break-all text-xs text-text-muted">{student.email || 'No email'}</span></button>)}{!matches.length && <p className="p-5 text-sm text-text-muted">No prospects match your search.</p>}</div>
        {matches.length > 40 && <p className="mt-2 text-xs text-text-muted">Showing 40 of {matches.length} prospects. Refine your search.</p>}
      </>}
    </section>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={load} className="underline">Retry</button></p>}
    {loading && <p role="status" className="p-5 text-sm text-text-muted">Loading application information…</p>}
    {data?.student && <>
      <section className={`${card} flex flex-wrap items-center justify-between gap-4`}><div><p className="text-xs text-text-muted">{data.student.reference || 'Selected prospect'}</p><h2 className="mt-1 text-xl font-semibold text-navy">{data.student.fullName || 'Prospect'}</h2><p className="mt-2 break-all text-sm text-text-muted">{data.student.email || 'No email'}{data.student.phone ? ` · ${data.student.phone}` : ''}</p></div><button disabled={busy} className={secondary} onClick={() => setPicking(true)}>Change prospect</button></section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section ref={formPanel} className={card}>
          <h2 className="font-semibold text-navy">{canWrite ? (selected ? 'Edit application' : '2. New application') : 'Application access'}</h2>
          {canWrite ? <form onSubmit={submit} className="mt-5 space-y-5">
            <button type="button" disabled={busy || loading} className={secondary} onClick={startNew}>+ New application</button>
            <p className="text-xs text-text-muted">Fields marked * are required. This records the application in Airtable; it does not submit to the university portal.</p>
            <fieldset disabled={busy || loading} className="space-y-5">
              <Field label="University *"><input required maxLength={1000} className={control} value={form.university} onChange={event => change('university', event.target.value)} placeholder="University name" /></Field>
              <Field label="Course *"><input required maxLength={1000} className={control} value={form.course} onChange={event => change('course', event.target.value)} placeholder="Course or programme name" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Course language *">{options('language', { IT: 'Italian', EN: 'English' })}</Field><Field label="Degree level *">{options('degree', DEGREE_LABELS)}</Field></div>
              <Field label="Campus city"><input maxLength={1000} className={control} value={form.city} onChange={event => change('city', event.target.value)} /></Field>
              <Field label="University portal URL"><input type="url" maxLength={1000} className={control} value={form.portalUrl} onChange={event => change('portalUrl', event.target.value)} placeholder="https://…" /></Field>
              <Field label="Portal account password hint"><input autoComplete="off" maxLength={1000} className={control} value={form.passwordHint} onChange={event => change('passwordHint', event.target.value)} placeholder="Optional hint" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Application status *">{options('status')}</Field><Field label={`Date of candidacy${form.status !== 'Proposal' ? ' *' : ''}`}><input className={control} type="date" required={form.status !== 'Proposal'} value={form.candidacyDate} onChange={event => change('candidacyDate', event.target.value)} /></Field></div>
              <Field label="University answer date"><input className={control} type="date" min={form.candidacyDate || undefined} value={form.answerDate} onChange={event => change('answerDate', event.target.value)} /></Field>
              <Field label="Comment"><textarea maxLength={10000} rows={4} className={control} value={form.comment} onChange={event => change('comment', event.target.value)} /></Field>
              <div className="rounded-lg bg-canvas p-3 text-sm"><span className="text-text-muted">Submitted By · </span><strong className="font-medium text-navy">{selected ? (selected.submittedBy || 'Not recorded') : `${user.displayName || user.username} (${user.username})`}</strong><p className="mt-1 text-xs text-text-muted">{selected ? 'Original submitter is preserved when editing.' : 'Set automatically from your account when this application is recorded.'}</p></div>
              {!!duplicates.length && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>A similar application already exists for this prospect. Check the existing candidatures before continuing.</p><label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={confirmDuplicate} onChange={event => setConfirmDuplicate(event.target.checked)} /><span>This is a separate candidature; create another record.</span></label></div>}
              <div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondary} onClick={() => { if (!dirty || window.confirm('Clear this unsaved application?')) { setForm(baseline); setConfirmDuplicate(false); setSaveError(''); } }}>Reset form</button><button data-write="" type="submit" className={primary} disabled={!!duplicates.length && !confirmDuplicate}>{busy ? 'Saving…' : selected ? 'Save changes' : 'Submit application'}</button></div>
            </fieldset>
            {saveError && <p role="alert" className="whitespace-pre-wrap text-sm text-red-700">{saveError}</p>}
          </form> : <p className="mt-4 text-sm text-text-muted">View access allows you to consult this prospect’s applications. Creating and editing applications is reserved for Admin and Editor accounts.</p>}
          {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">{success}</p>}
        </section>
        <section className={card}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-navy">Existing applications ({data.applications.length})</h2><button disabled={loading || busy} className={secondary} onClick={load}>Refresh</button></div>
          <div className="mt-4 max-h-[65vh] space-y-3 overflow-y-auto overscroll-contain pr-2" aria-label="Existing applications list" tabIndex={0}>{data.applications.map(application => <details key={application.id} className={`rounded-lg border p-4 ${selected?.id === application.id ? "border-navy bg-blue-50" : "border-border"}`}><summary onClick={() => { if (canWrite) selectApplication(application); }} className="cursor-pointer space-y-2"><span className="block break-words text-sm font-semibold text-navy">{application.university || 'University not set'}</span><span className="block break-words text-sm text-text-muted">{application.course || 'Course not set'}</span><Status value={application.status} /><span className="block text-xs text-text-muted">{formatDate(application.candidacyDate)} · {application.language || 'Language not set'}</span></summary><button type="button" disabled={busy || loading} className={`${secondary} mt-3`} onClick={() => selectApplication(application)}>{canWrite ? "Edit application" : "Select application"}</button><dl className="mt-4 space-y-3 border-t border-border pt-4 text-sm">{[['Degree', DEGREE_LABELS[application.degree] || application.degree], ['Campus city', application.city], ['University answer', formatDate(application.answerDate)], ['Submitted By', application.submittedBy || 'Not recorded'], ['Password hint', application.passwordHint]].map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 break-words">{value || '—'}</dd></div>)}{safePortal(application.portalUrl) && <div><dt className="text-xs text-text-muted">University portal</dt><dd><a className="break-all text-navy underline" href={safePortal(application.portalUrl)} target="_blank" rel="noopener noreferrer">Open portal ↗</a></dd></div>}{application.comment && <div><dt className="text-xs text-text-muted">Comment</dt><dd className="mt-1 whitespace-pre-wrap break-words">{application.comment}</dd></div>}</dl></details>)}{!data.applications.length && <p className="rounded-lg bg-canvas p-5 text-sm text-text-muted">No applications recorded for this prospect.</p>}</div>
        </section>
      </div>
    </>}
  </div>;
}
