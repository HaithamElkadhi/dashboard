import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TicketTimeline from '../components/tasks/TicketTimeline.jsx';
import Modal from '../components/Modal.jsx';
import { useTasksWorkspace } from '../contexts/TasksWorkspaceContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { fetchTicketChoices, fetchProspectsForSearch } from '../lib/airtable.js';
import { isTicket, ticketTitle, selectTickets, ticketOverdue, ticketPatch, tunisToday } from '../lib/ticketing.js';

const control = 'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-strong';
const secondary = 'min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50';
const primary = 'min-h-11 rounded-lg bg-navy px-5 py-2 text-sm font-medium text-white hover:bg-navy-strong disabled:opacity-50';
const initialFilters = { view: 'open', query: '', assignedTo: '', priority: '', status: '', type: '', due: '', sort: 'deadline' };
const views = [['open', 'Open'], ['unassigned', 'Unassigned'], ['overdue', 'Overdue'], ['blocked', 'Blocked'], ['resolved', 'Resolved'], ['archived', 'Archived'], ['all', 'All']];
const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis' }).format(new Date(value)) : 'No due date';
function Field({ label, children }) { return <label className="block space-y-2 text-sm font-medium text-text-strong"><span>{label}</span>{children}</label>; }
function Choice({ value, options = [], onChange, label, emptyLabel = 'All', labels = {}, allowEmpty = true, disabled = false }) {
  const values = value && !options.includes(value) ? [value, ...options] : options;
  return <select disabled={disabled} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={control}>{allowEmpty && <option value="">{emptyLabel}</option>}{values.map((v) => <option key={v} value={v}>{labels[v] || v}</option>)}</select>;
}
function Status({ ticket }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ticket.status === 'Done' ? 'bg-green-50 text-green-800' : ticket.status === 'Blocked' ? 'bg-red-50 text-red-800' : 'bg-canvas text-navy'}`}>{ticket.status || 'Missing status'}</span>;
}
function Priority({ value }) {
  const colors = { high: 'bg-red-50 text-red-800 border-red-200', medium: 'bg-amber-50 text-amber-900 border-amber-200', low: 'bg-green-50 text-green-800 border-green-200' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${colors[value?.toLowerCase()] || 'bg-canvas text-text-muted border-border'}`}>{value || 'No priority'}</span>;
}

function TicketEditor({ ticket, students, choices, optionsError, retryOptions, onSave, onClose, initialTab = 'details' }) {
  const creating = !ticket;
  const baseline = useMemo(() => ticket ? Object.fromEntries(['subject', 'description', 'linkedProspectIds', 'prospectName', 'email', 'phone', 'assignedTo', 'status', 'priority', 'type', 'ddl', 'notes'].map((k) => [k, ticket[k] ?? (k === 'linkedProspectIds' ? [] : '')])) : { subject: '', description: '', linkedProspectIds: [], prospectName: '', email: '', phone: '', assignedTo: '', status: 'Todo', priority: 'Medium', type: '', ddl: '', notes: '' }, [ticket]);
  const [form, setForm] = useState(baseline);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [changeComment, setChangeComment] = useState('');
  const [editorTab, setEditorTab] = useState(initialTab);
  const [historyComment, setHistoryComment] = useState('');
  const hasFormChanges = JSON.stringify(form) !== JSON.stringify(baseline) || Boolean(changeComment.trim());
  const dirty = hasFormChanges || Boolean(historyComment.trim());
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const close = () => { if (!busy && (!dirty || window.confirm('Discard unsaved ticket changes?'))) onClose(); };
  const submit = async (event) => {
    event.preventDefault();
    if (!choices) { setError('Load Airtable choices before saving.'); return; }
    if (creating && (!form.subject.trim() || !form.description.trim() || !form.linkedProspectIds.length || !form.type || !form.priority)) { setError('Subject, description, student, category and priority are required.'); return; }
    if (form.status === 'Archived' && baseline.status !== 'Archived' && !archiveConfirm) { setArchiveConfirm(true); return; }
    setBusy(true); setError('');
    try {
      const input = creating ? form : ticketPatch(baseline, form);
      if (creating || Object.keys(input).length || changeComment.trim()) await onSave(input, ticket?.id, { comment: changeComment, ...(ticket ? { expected: { status: baseline.status, assignedTo: baseline.assignedTo } } : {}) });
      setChangeComment('');
      if (historyComment.trim()) setEditorTab('history');
      else onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const selectStudent = (student) => {
    if (form.linkedProspectIds.includes(student.id)) return;
    const ids = [...form.linkedProspectIds, student.id];
    setForm((prev) => ({ ...prev, linkedProspectIds: ids, prospectName: ids.map((id) => students.find((s) => s.id === id)?.fullName || id).join(', '), ...(creating && !prev.linkedProspectIds.length ? { email: prev.email || student.email, phone: prev.phone || student.phone } : {}) }));
    setQuery('');
  };
  return <Modal title={creating ? 'New ticket' : ticketTitle(ticket)} subtitle={ticket ? `${ticket.ticketId || ticket.id} · Created ${ticket.createdAt ? dateLabel(ticket.createdAt) : 'date unavailable'}` : 'Capture a student request and assign its next action.'} onClose={close} size="lg">
    {!creating && <div className="mb-5 flex gap-2 border-b border-border pb-4">{[['details', 'Details'], ['history', 'Comments & history']].map(([key, label]) => <button key={key} type="button" aria-pressed={editorTab === key} className={editorTab === key ? primary : secondary} onClick={() => setEditorTab(key)}>{label}</button>)}</div>}
    <form onSubmit={submit} className={editorTab === 'details' ? '' : 'hidden'}><fieldset disabled={busy} className="space-y-6">
      <p className="text-xs text-text-muted">{creating ? 'Fields marked * are required.' : 'Changes are shared with the team. Status and assignment changes are recorded in Comments & history.'}</p>
      {ticket?.legacyAssignedTo && !ticket.assignedTo && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Previous assignment: {ticket.legacyAssignedTo}. Select a platform user to assign this ticket.</p>}
      <Field label={`Subject${creating ? ' *' : ''}`}><input className={control} required={creating} value={form.subject} onChange={(e) => change('subject', e.target.value)} /></Field>
      <Field label={`Description${creating ? ' *' : ''}`}><textarea className={control} rows={5} required={creating} value={form.description} onChange={(e) => change('description', e.target.value)} /></Field>
      <section className="space-y-3 rounded-2xl border border-border bg-canvas p-4">
        <h3 className="text-sm font-semibold text-navy">Student{creating ? ' *' : ''}</h3>
        {form.linkedProspectIds.map((id) => <div key={id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-sm"><Link to={`/prospects?open=${id}`} onClick={(e) => { if (dirty && !window.confirm("Discard unsaved changes and open the student record?")) e.preventDefault(); }} className="break-words text-navy underline">{students.find((s) => s.id === id)?.fullName || `Linked student · ${id}`}</Link><button type="button" disabled={busy} onClick={() => { const ids = form.linkedProspectIds.filter(v => v !== id); setForm(prev => ({ ...prev, linkedProspectIds: ids, prospectName: ids.map(v => students.find(s => s.id === v)?.fullName || v).join(', ') })); }} className={secondary}>Remove</button></div>)}
        {!form.linkedProspectIds.length && <p className="text-sm text-text-muted">{form.prospectName || 'No linked student yet.'}</p>}
        <input aria-label="Search students" placeholder="Search students by name…" value={query} onChange={(e) => setQuery(e.target.value)} className={control} />
        {query && <ul className="max-h-40 overflow-auto rounded-lg border border-border bg-white">{students.filter((s) => s.fullName.toLowerCase().includes(query.toLowerCase()) && !form.linkedProspectIds.includes(s.id)).slice(0, 20).map((s) => <li key={s.id}><button type="button" onClick={() => selectStudent(s)} className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-canvas">{s.fullName}</button></li>)}{!students.some((s) => s.fullName.toLowerCase().includes(query.toLowerCase())) && <li className="p-3 text-sm text-text-muted">No matching student.</li>}</ul>}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email"><input className={control} type="email" value={form.email} onChange={(e) => change('email', e.target.value)} /></Field>
        <Field label="Phone"><input className={control} type="tel" value={form.phone} onChange={(e) => change('phone', e.target.value)} /></Field>
        <Field label="Assigned to"><Choice label="Assigned to" value={form.assignedTo} options={choices?.assignedTo} labels={{ ...choices?.assigneeLabels, ...(ticket?.assignedTo ? { [ticket.assignedTo]: choices?.assigneeLabels?.[ticket.assignedTo] || ticket.assignedToName || 'Unavailable user' } : {}) }} onChange={(v) => change('assignedTo', v)} emptyLabel="Unassigned" /></Field>
        <Field label={`Category${creating ? ' *' : ''}`}><Choice label="Category" value={form.type} options={choices?.type} onChange={(v) => change('type', v)} emptyLabel="Select category" /></Field>
        <Field label={`Priority${creating ? ' *' : ''}`}><Choice label="Priority" value={form.priority} options={choices?.priority} onChange={(v) => change('priority', v)} emptyLabel="Select priority" /></Field>
        <Field label="Due date"><input type="date" className={control} value={form.ddl} onChange={(e) => change('ddl', e.target.value)} /></Field>
        {!creating && <Field label="Status"><Choice label="Status" value={form.status} options={choices?.status} onChange={(v) => { change('status', v); setArchiveConfirm(false); }} emptyLabel="Missing status" /></Field>}
      </div>
      <Field label="Internal notes"><textarea className={control} rows={4} value={form.notes} onChange={(e) => change('notes', e.target.value)} /></Field>
      {ticket && <section className="space-y-3"><h3 className="text-sm font-semibold text-navy">Attachments</h3>{ticket.attachments.length ? ticket.attachments.map((a) => <div key={a.id} className="rounded-lg border border-border p-3">{a.thumbnails?.small?.url && <img src={a.thumbnails.small.url} alt="" className="mb-2 max-h-24 rounded object-contain" />}<a href={/^https:\/\//.test(a.url) ? a.url : undefined} target="_blank" rel="noreferrer" className="break-all text-sm text-navy underline">{a.filename || 'Attachment'}</a></div>) : <p className="text-sm text-text-muted">No attachments. Existing files are read-only here.</p>}</section>}
      {!creating && <Field label="Comment on these changes (optional)"><textarea className={control} maxLength={10000} rows={2} value={changeComment} onChange={(e) => setChangeComment(e.target.value)} /></Field>}
      {optionsError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{optionsError} <button type="button" onClick={retryOptions} className="underline">Retry</button></div>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {archiveConfirm && <p role="alert" className="rounded-lg border border-border bg-canvas p-4 text-sm">Archiving removes this ticket from the active queue. You can restore it from Archived. Click Confirm archive to save, or choose another status to cancel.</p>}
      <div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" className={secondary} onClick={close} disabled={busy}>Cancel</button><button className={primary} disabled={busy || !choices || (!creating && !hasFormChanges)}>{busy ? 'Saving…' : archiveConfirm ? 'Confirm archive' : creating ? 'Create ticket' : 'Save changes'}</button></div>
    </fieldset></form>
    {ticket && <div className={editorTab === 'history' ? '' : 'hidden'}><TicketTimeline ticket={ticket} comment={historyComment} onCommentChange={setHistoryComment} onComment={async (comment) => {
      if (busy || hasFormChanges) throw new Error('Save or cancel your ticket edits before adding a comment.');
      await onSave({}, ticket.id, { comment });
    }} /></div>}
  </Modal>;
}

export default function TicketingPage() {
  const { tasks, status, error, lastUpdated, refresh, saveTicketRecord, deleteTicketRecord, showToast } = useTasksWorkspace();
  const { user } = useAuth();
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [params, setParams] = useSearchParams();
  const [choices, setChoices] = useState(null);
  const [students, setStudents] = useState([]);
  const [optionsError, setOptionsError] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [warning, setWarning] = useState('');
  const [page, setPage] = useState(1);
  const [today, setToday] = useState(tunisToday);
  const loadOptions = async () => {
    setOptionsError('');
    try { const [c, s] = await Promise.all([fetchTicketChoices(), fetchProspectsForSearch()]); setChoices(c); setStudents(s); }
    catch (err) { setOptionsError(err.message); }
  };
  useEffect(() => { loadOptions(); const timer = setInterval(() => setToday(tunisToday()), 30000); return () => clearInterval(timer); }, []);
  usePageRefreshRegistration({ lastUpdated, refresh, loading: status === 'loading' });
  const tickets = useMemo(() => tasks.filter(isTicket).map((t) => ({ ...t, prospectName: t.linkedProspectIds.map((id) => students.find((s) => s.id === id)?.fullName).filter(Boolean).join(', ') || t.prospectName })), [tasks, students]);
  const scopedTickets = assignedToMe ? tickets.filter(ticket => ticket.assignedTo === user?.id) : tickets;
  const filtered = selectTickets(scopedTickets, filters, today);
  const counts = Object.fromEntries(views.map(([view]) => [view, selectTickets(scopedTickets, { ...filters, view }, today).length]));
  const pages = Math.max(1, Math.ceil(filtered.length / 15));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 15, currentPage * 15);
  const selected = tickets.find((t) => t.id === params.get('ticket'));
  const creating = params.get('new') === '1';
  const open = (id, tab = 'details') => setParams(id ? { ticket: id, ...(tab === 'history' ? { tab: 'history' } : {}) } : { new: '1' });
  const activeFilterCount = ['assignedTo', 'priority', 'status', 'type', 'due'].filter(key => filters[key]).length;
  const rowActions = (ticket) => <div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => open(ticket.id)}>Details</button><button className={secondary} onClick={() => open(ticket.id, 'history')}>History</button><button className="min-h-11 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50" onClick={() => beginAction(ticket, null)}>Delete</button></div>;
  const updateFilter = (key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); };
  const options = (key) => Array.from(new Set([...(choices?.[key] || []), ...tickets.map((t) => t[key]).filter(Boolean)]));
  const save = async (input, id, activity) => {
    const result = await saveTicketRecord(input, id, activity);
    setWarning(result.warning || '');
    showToast(id ? 'Ticket updated.' : 'Ticket created.');
    return result;
  };
  const beginAction = (ticket, input) => { setAction({ ticket, input }); setActionComment(''); setActionError(''); };
  const applyAction = async () => {
    setActionBusy(true); setActionError('');
    const expected = { status: action.ticket.status, assignedTo: action.ticket.assignedTo };
    try {
      if (action.input === null) { const result = await deleteTicketRecord(action.ticket.id, expected); setWarning(result.warning || ''); showToast('Ticket deleted. History retained in Airtable.'); }
      else await save(action.input, action.ticket.id, { comment: actionComment, expected });
      setAction(null);
    } catch (err) { setActionError(err.message); } finally { setActionBusy(false); }
  };
  const inlineControls = (ticket) => <div className="grid gap-2">
    <Choice disabled={!choices || actionBusy} label={'Assign ' + ticketTitle(ticket)} value={ticket.assignedTo} options={choices?.assignedTo} labels={{ ...choices?.assigneeLabels, ...(ticket?.assignedTo ? { [ticket.assignedTo]: choices?.assigneeLabels?.[ticket.assignedTo] || ticket.assignedToName || 'Unavailable user' } : {}) }} emptyLabel="Unassigned" onChange={(assignedTo) => { if (assignedTo !== ticket.assignedTo) beginAction(ticket, { assignedTo }); }} />
    <Choice disabled={!choices || actionBusy} label={'Status of ' + ticketTitle(ticket)} value={ticket.status} options={choices?.status} emptyLabel="Missing status" allowEmpty={!ticket.status} onChange={(status) => { if (status !== ticket.status) beginAction(ticket, { status }); }} />
    {rowActions(ticket)}
  </div>;

  return <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
    <p className="text-sm text-text-muted">Student requests, ownership and next actions — all in one queue.</p>
    {warning && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warning}</div>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={refresh} className="underline">Retry</button></div>}
    {optionsError && <div role="alert" className="rounded-2xl border border-border bg-white p-4 text-sm">{optionsError} <button onClick={loadOptions} className="text-navy underline">Retry choices and students</button></div>}
    <section className="space-y-3 rounded-2xl border border-border bg-white p-4">
      <div className="flex gap-1 overflow-x-auto" aria-label="Ticket views">{views.map(([key, label]) => <button key={key} aria-pressed={filters.view === key} onClick={() => updateFilter('view', key)} className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium ${filters.view === key ? 'bg-navy text-white' : 'text-text-muted hover:bg-canvas'}`}>{label}{!['resolved', 'archived', 'all'].includes(key) && counts[key] > 0 && <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-700 px-1.5 text-xs font-semibold text-white" aria-label={`${counts[key]} tickets`}>{counts[key]}</span>}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm text-navy"><input type="checkbox" className="h-4 w-4 accent-navy" checked={assignedToMe} onChange={event => { setAssignedToMe(event.target.checked); setFilters(prev => ({ ...prev, ...(event.target.checked ? { view: 'all', assignedTo: '' } : {}) })); setPage(1); }} />Assigned to me</label>
        <input aria-label="Search tickets" placeholder="Search reference, subject, student…" className={`${control} min-w-0 flex-1 basis-52`} value={filters.query} onChange={(e) => updateFilter('query', e.target.value)} />
        <div className="w-40"><Choice value={filters.sort} options={['deadline', 'created', 'priority']} label="Sort tickets" allowEmpty={false} labels={{deadline: 'Due date', created: 'Newest first', priority: 'Priority'}} onChange={(v) => updateFilter('sort', v)} /></div>
        <button className={secondary} aria-expanded={filtersOpen} aria-controls="ticket-filters" onClick={() => setFiltersOpen(v => !v)}>{filtersOpen ? 'Hide filters' : 'Filters'}{activeFilterCount ? ` (${activeFilterCount})` : ''}</button>
        {(assignedToMe || activeFilterCount > 0 || filters.query || filters.sort !== 'deadline' || filters.view !== 'open') && <button className={secondary} onClick={() => { setFilters(initialFilters); setAssignedToMe(false); setPage(1); }}>Reset</button>}
      </div>
      {filtersOpen && <div id="ticket-filters" className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['assignedTo', 'Responsible'], ['priority', 'Priority'], ['status', 'Status'], ['type', 'Category']].map(([key, label]) => <Field key={key} label={label}><Choice value={filters[key]} options={options(key)} labels={key === 'assignedTo' ? { ...Object.fromEntries(tickets.filter(t => t.assignedTo).map(t => [t.assignedTo, t.assignedToName || 'Unavailable user'])), ...choices?.assigneeLabels } : {}} label={label} onChange={(v) => updateFilter(key, v)} /></Field>)}
        <Field label="Due date"><Choice value={filters.due} options={['today', 'none']} label="Due date filter" labels={{today: 'Due today', none: 'No due date'}} onChange={(v) => updateFilter('due', v)} /></Field>
      </div>}
      {activeFilterCount > 0 && <div className="flex flex-wrap gap-2" aria-label="Applied filters">{[['assignedTo', 'Responsible'], ['priority', 'Priority'], ['status', 'Status'], ['type', 'Category'], ['due', 'Due date']].filter(([key]) => filters[key]).map(([key, label]) => <button key={key} className="min-h-11 rounded-lg bg-canvas px-3 text-xs text-navy" aria-label={`Remove ${label} filter`} onClick={() => updateFilter(key, '')}>{label}: {key === 'due' ? filters[key] === 'today' ? 'Due today' : 'No due date' : key === 'assignedTo' ? choices?.assigneeLabels?.[filters[key]] || 'Unavailable user' : filters[key]} ×</button>)}</div>}
    </section>
    {status === 'loading' && !tasks.length ? <div aria-label="Loading tickets" className="skeleton h-64 rounded-2xl" /> : <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-canvas text-xs text-text-muted"><tr>{['Ticket / subject', 'Student', 'Object', 'Responsible', 'Status', 'Due date', 'Created', 'Manage'].map((label) => <th key={label} className="px-4 py-4 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((t) => <tr key={t.id} className="hover:bg-canvas/60"><td className="max-w-xs px-4 py-4"><button className="text-left text-navy hover:underline" onClick={() => open(t.id)}><span className="block text-xs text-text-muted">{t.ticketId || t.id}</span><span className="mt-1 line-clamp-2 font-medium">{ticketTitle(t)}</span></button></td><td className="max-w-48 break-words px-4 py-4">{t.prospectName || (t.linkedProspectIds.length ? 'Linked student (name unavailable)' : 'Student not linked')}</td><td className="px-4 py-4"><span className="block break-words text-sm text-text-strong">{t.subject || 'No object'}</span><div className="mt-2"><Priority value={t.priority} /></div></td><td className="min-w-[150px] px-4 py-4"><Choice disabled={!choices || actionBusy} label={'Assign ' + ticketTitle(t)} value={t.assignedTo} options={choices?.assignedTo} labels={{ ...choices?.assigneeLabels, ...(t?.assignedTo ? { [t.assignedTo]: choices?.assigneeLabels?.[t.assignedTo] || t.assignedToName || 'Unavailable user' } : {}) }} emptyLabel="Unassigned" onChange={(assignedTo) => { if (assignedTo !== t.assignedTo) beginAction(t, { assignedTo }); }} /></td><td className="min-w-[150px] px-4 py-4"><Choice disabled={!choices || actionBusy} label={'Status of ' + ticketTitle(t)} value={t.status} options={choices?.status} emptyLabel="Missing status" allowEmpty={!t.status} onChange={(status) => { if (status !== t.status) beginAction(t, { status }); }} /></td><td className={`whitespace-nowrap px-4 py-4 ${ticketOverdue(t, today) ? 'text-red-700' : 'text-text-muted'}`}>{dateLabel(t.ddl)}{ticketOverdue(t, today) && <span className="block text-xs">Overdue</span>}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-text-muted">{t.createdAt ? dateLabel(t.createdAt) : 'Unknown'}</td><td className="px-4 py-4">{rowActions(t)}</td></tr>)}</tbody></table></div>
      <div className="divide-y divide-border md:hidden">{rows.map((t) => <article key={t.id} className="space-y-3 p-5"><button onClick={() => open(t.id)} className="block w-full space-y-2 text-left"><span className="block text-xs text-text-muted">{t.ticketId || t.id}</span><span className="block break-words font-semibold text-navy">{ticketTitle(t)}</span><span className="block text-sm text-text-muted">{t.prospectName || 'Student not linked'}</span><Status ticket={t} /><Priority value={t.priority} /><span className="block break-words text-sm text-text-strong">Object: {t.subject || 'No object'}</span><span className={`block text-xs ${ticketOverdue(t, today) ? 'text-red-700' : 'text-text-muted'}`}>{dateLabel(t.ddl)}{ticketOverdue(t, today) ? ' · Overdue' : ''}</span></button>{inlineControls(t)}</article>)}</div>
      {!filtered.length && <div className="space-y-3 p-10 text-center"><p className="font-medium text-navy">{status === 'error' ? 'Tickets could not be loaded.' : 'No tickets match this view.'}</p><p className="text-sm text-text-muted">Reset your filters or create a student request.</p><button className={secondary} onClick={() => open()}>New ticket</button></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-text-muted"><span>{filtered.length ? `${(currentPage - 1) * 15 + 1}–${Math.min(currentPage * 15, filtered.length)}` : '0'} of {filtered.length} tickets</span><div className="flex items-center gap-2"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={secondary}>Previous</button><span>{currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className={secondary}>Next</button></div></div>
    </section>}
    {action && <Modal title={action.input === null ? 'Delete ticket?' : action.input.status ? 'Change status' : 'Change assignment'} subtitle={ticketTitle(action.ticket)} onClose={() => { if (!actionBusy) setAction(null); }} size="sm">
      <div className="space-y-4">
        {action.input === null ? <p className="text-sm">This permanently deletes the ticket and its attachment links. Its comments and history remain in Ticket History. This cannot be undone in the app.</p> : <>
          <p className="text-sm">{action.input.status ? 'Status: ' + (action.ticket.status || 'Missing status') + ' → ' + action.input.status : 'Assigned to: ' + (choices?.assigneeLabels?.[action.ticket.assignedTo] || action.ticket.assignedToName || 'Unassigned') + ' → ' + (choices?.assigneeLabels?.[action.input.assignedTo] || 'Unassigned')}</p>
          <Field label="Comment (optional)"><textarea rows={3} maxLength={10000} disabled={actionBusy} value={actionComment} onChange={e => setActionComment(e.target.value)} className={control} /></Field>
        </>}
        {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
        <div className="flex justify-end gap-3"><button disabled={actionBusy} onClick={() => setAction(null)} className={secondary}>Cancel</button><button disabled={actionBusy} onClick={applyAction} className={action.input === null ? 'min-h-11 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50' : primary}>{actionBusy ? 'Saving…' : action.input === null ? 'Delete permanently' : 'Save change'}</button></div>
      </div>
    </Modal>}
    {(creating || selected) && <TicketEditor key={creating ? 'new' : selected.id + ':' + (params.get('tab') || 'details')} initialTab={params.get('tab') === 'history' ? 'history' : 'details'} ticket={creating ? null : selected} students={students} choices={choices} optionsError={optionsError} retryOptions={loadOptions} onSave={save} onClose={() => setParams({})} />}
    {params.get('ticket') && !selected && status !== 'loading' && <Modal title="Ticket unavailable" onClose={() => setParams({})}><p>This ticket was not found, is not a ticket, or could not be loaded.</p><button onClick={refresh} className={`${secondary} mt-4`}>Retry</button></Modal>}
  </div>;
}
