import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { documentsApi, documentUsers, emailTemplate, REVIEW_STATUSES, REQUIREMENTS, FOLDER_STATUSES, FOLDER_STATUS_LABELS, SOURCE_FIELDS } from '../lib/studentDocuments.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { downloadDocumentZip } from '../lib/documentDownload.js';

const PdfPreview = lazy(() => import('../components/documents/PdfPreview.jsx'));
const input = 'min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-text-strong';
const secondary = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50';
const primary = 'min-h-11 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-strong disabled:opacity-50';
const card = 'rounded-xl border border-border bg-white p-4 sm:p-5';
const fmt = value => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis', dateStyle: 'medium', ...(value.includes('T') ? { timeStyle: 'short' } : {}) }).format(new Date(value)) : '—';
const safeUrl = url => /^https:\/\//i.test(url || '') ? url : undefined;
function Field({ label, children }) { return <label className="block space-y-1.5 text-sm font-medium text-text-strong"><span>{label}</span>{children}</label>; }
function Badge({ value }) {
  const colors = { Validated: 'bg-green-50 text-green-800', Complete: 'bg-green-50 text-green-800', Missing: 'bg-red-50 text-red-800', 'Needs correction': 'bg-red-50 text-red-800', Incomplete: 'bg-red-50 text-red-800', Received: 'bg-blue-50 text-blue-800', 'Under review': 'bg-amber-50 text-amber-900' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colors[value] || 'bg-canvas text-text-muted'}`}>{value || 'Not set'}</span>;
}
function Select({ value, values, labels = {}, onChange, label, empty }) { return <select aria-label={label} className={input} value={value} onChange={event => onChange(event.target.value)}>{empty && <option value="">{empty}</option>}{value && !values.includes(value) && <option value={value}>{labels[value] || 'Unavailable user'}</option>}{values.map(v => <option key={v} value={v}>{labels[v] || v}</option>)}</select>; }
function Assignee({ value, name, users, onChange }) { return <Field label="Responsible"><Select label="Responsible" value={value} values={users?.assignedTo || []} labels={{ ...(value ? { [value]: name || 'Unavailable user' } : {}), ...users?.assigneeLabels }} empty="Unassigned" onChange={onChange} /></Field>; }
function Preview({ files }) {
  const [index, setIndex] = useState(0);
  const file = files[Math.min(index, Math.max(0, files.length - 1))];
  if (!file) return <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-canvas p-6 text-center text-sm text-text-muted">No file received yet. Upload a file or request it from the student.</div>;
  const url = safeUrl(file.url);
  const image = file.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.filename || '');
  const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.filename || '');
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="break-all text-sm font-medium">{file.filename}</span><span className="text-xs text-text-muted">{file.size ? (file.size / 1024).toFixed(0) + ' KB' : ''}</span></div>
    {files.length > 1 && <Select label="File version" value={String(index)} values={files.map((_, i) => String(i))} labels={Object.fromEntries(files.map((f, i) => [String(i), `${i === 0 ? 'Latest · ' : ''}${f.filename}`]))} onChange={value => setIndex(Number(value))} />}
    {url && image ? <img src={url} alt={file.filename || 'Student document'} className="max-h-[60vh] w-full rounded-lg border border-border bg-canvas object-contain" /> : url && pdf ? <Suspense fallback={<p className="p-6 text-sm text-text-muted">Loading PDF preview…</p>}><PdfPreview url={url} name={file.filename} /></Suspense> : <p className="rounded-lg bg-canvas p-5 text-sm text-text-muted">Preview unavailable for this format. Open or download the file.</p>}
    <div className="flex gap-2">{url && <><a href={url} target="_blank" rel="noopener noreferrer" className={secondary}>Open file ↗</a><a href={url} download={file.filename} target="_blank" rel="noopener noreferrer" className={secondary}>Download</a></>}</div>
    <p className="text-xs text-text-muted">File links are temporary. Refresh the page if a link has expired.</p>
  </div>;
}
function DocumentEditor({ doc, users, activity, onSave, onClose }) {
  const baseline = { status: doc.status, requirement: doc.requirement, note: doc.note, reason: doc.reason, due: doc.due, assignedTo: doc.assignedTo };
  const [form, setForm] = useState(baseline), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const close = () => { if (!busy && (!dirty || window.confirm('Discard unsaved document review?'))) onClose(); };
  const save = async event => { event.preventDefault(); setBusy(true); setError(''); try { await onSave({ action: 'review', key: doc.key, expectedUpdatedAt: doc.updatedAt, ...form }); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const upload = async file => {
    if (!file) return;
    if (dirty) { setError('Save or discard your review edits before uploading a version.'); return; }
    if (file.size > 3 * 1024 * 1024 || !file.size) { setError('Choose a non-empty file smaller than 3 MB.'); return; }
    setBusy(true); setError('');
    try { const reader = new FileReader(); const encoded = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('Unable to read this file.')); reader.readAsDataURL(file); }); await onSave({ action: 'upload', key: doc.key, expectedUpdatedAt: doc.updatedAt, filename: file.name, contentType: file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : /\.docx$/i.test(file.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.doc$/i.test(file.name) ? 'application/msword' : ''), file: encoded }); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title={doc.name} subtitle={`${doc.source} · ${doc.category}`} size="xl" onClose={close}>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Preview files={doc.files} /><div className="space-y-5">
      {doc.detached && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The original file is no longer in its source folder. Review history and uploaded versions are retained.</p>}
      <form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Review status"><Select label="Review status" value={form.status} values={REVIEW_STATUSES} onChange={value => change('status', value)} /></Field><Field label="Requirement"><Select label="Requirement" value={form.requirement} values={REQUIREMENTS} onChange={value => change('requirement', value)} /></Field></div>
        <Assignee users={users} name={doc.assignedToName} value={form.assignedTo} onChange={value => change('assignedTo', value)} />
        <Field label="Due date"><input type="date" className={input} value={form.due} onChange={event => change('due', event.target.value)} /></Field>
        <Field label="Internal note"><textarea className={input} rows={3} maxLength={10000} value={form.note} onChange={event => change('note', event.target.value)} /></Field>
        <Field label="Correction required (included in correction emails)"><textarea className={input} rows={3} required={form.status === 'Needs correction'} maxLength={10000} value={form.reason} onChange={event => change('reason', event.target.value)} /></Field>
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={close} className={secondary}>Cancel</button><button disabled={!dirty || busy} className={primary}>{busy ? 'Saving…' : 'Save review'}</button></div>
      </fieldset></form>
      <div className="space-y-2 border-t border-border pt-4"><Field label="Upload a file / new version"><input data-write="" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" disabled={busy} className="block w-full text-sm" onChange={event => { upload(event.target.files[0]); event.target.value = ''; }} /></Field><p className="text-xs text-text-muted">Up to 3 MB. Previous files are preserved. A new version returns the document to Received for review.</p></div>
      <Activity records={activity.filter(row => row.fields['Document Key'] === doc.key)} compact />
    </div></div>
  </Modal>;
}
function Activity({ records, compact = false }) {
  return <section className="space-y-3"><h2 className="font-semibold text-navy">{compact ? 'Document history' : 'History & emails'}</h2>{!records.length && <p className="text-sm text-text-muted">No recorded activity yet.</p>}{records.map(row => { const f = row.fields; return <article key={row.id} className="rounded-lg border border-border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong className="text-navy">{f.Action}</strong><Badge value={f.Result} /></div><p className="mt-1 text-xs text-text-muted">{fmt(f['Occurred At'])} · {f.Actor}</p>{f.Result === 'Pending' && <p className="mt-2 text-amber-900">Result not confirmed. Refresh before retrying.</p>}{f.Result === 'Failed' && <p className="mt-2 text-red-800">Action failed.</p>}<p className="mt-2 whitespace-pre-wrap break-words text-text-muted">{f.Details}</p>{f.Action === 'Email' && <details className="mt-2"><summary className="cursor-pointer text-navy">{f.Subject} · {f.Recipient}</summary><p className="mt-3 whitespace-pre-wrap break-words">{f.Message}</p>{f.Result === 'Sent' && <p className="mt-2 text-xs text-text-muted">Accepted by the email provider. Delivery is not confirmed here.</p>}</details>}</article>; })}</section>;
}
function RequestEditor({ source, users, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', source, requirement: 'Required', due: '', note: '', assignedTo: '' }), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const close = () => { if (!busy && (!form.name && !form.note || window.confirm('Discard this document request?'))) onClose(); };
  const presets = form.source === 'Scholarship' ? Object.values(SOURCE_FIELDS.Scholarship) : ['Passport', 'Diploma', 'Transcript', 'Language certificate', 'CV', 'Motivation letter'];
  return <Modal title="Request a document" subtitle="Add a checklist item. An email is sent only from Email student." onClose={close}><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await onSave({ action: 'request', ...form }); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><fieldset disabled={busy} className="space-y-4">
    <Field label="Document group"><Select value={form.source} values={['Academic', 'Scholarship']} onChange={v => change('source', v)} /></Field>
    <Field label="Document name"><input list="document-presets" required maxLength={200} className={input} value={form.name} onChange={event => change('name', event.target.value)} /><datalist id="document-presets">{presets.map(name => <option key={name} value={name} />)}</datalist></Field>
    <Field label="Requirement"><Select value={form.requirement} values={REQUIREMENTS} onChange={v => change('requirement', v)} /></Field><Assignee users={users} value={form.assignedTo} onChange={v => change('assignedTo', v)} />
    <Field label="Due date"><input type="date" className={input} value={form.due} onChange={event => change('due', event.target.value)} /></Field><Field label="Internal note"><textarea rows={3} className={input} value={form.note} onChange={event => change('note', event.target.value)} /></Field>
    {error && <p role="alert" className="text-red-800">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={close} className={secondary}>Cancel</button><button className={primary} disabled={busy}>{busy ? 'Saving…' : 'Add request'}</button></div>
  </fieldset></form></Modal>;
}
function FolderEditor({ folder, source, users, onSave, onClose }) {
  const f = folder?.fields || {}, statusField = source === 'Academic' ? 'Documents Status' : 'Statut dossier bourse';
  const [form, setForm] = useState({ status: f[statusField] || FOLDER_STATUSES[source][0], assignedTo: f['Assigned User ID'] || '', due: f['Review Deadline'] || '', note: f['Review Note'] || '' }), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const change = (key, value) => { setDirty(true); setForm(prev => ({ ...prev, [key]: value })); };
  const close = () => { if (!busy && (!dirty || window.confirm('Discard folder edits?'))) onClose(); };
  return <Modal title={`${source} folder`} onClose={close}><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await onSave({ action: 'folder', folderId: folder?.id, source, ...form }); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><fieldset disabled={busy} className="space-y-4"><p className="text-xs text-text-muted">The folder status is managed separately from individual document reviews.</p><Field label="Folder status"><Select value={form.status} values={FOLDER_STATUSES[source]} labels={FOLDER_STATUS_LABELS} onChange={v => change('status', v)} /></Field><Assignee users={users} name={f['Assigned User Name']} value={form.assignedTo} onChange={v => change('assignedTo', v)} /><Field label="Review deadline"><input type="date" className={input} value={form.due} onChange={event => change('due', event.target.value)} /></Field><Field label="Internal note"><textarea rows={4} className={input} value={form.note} onChange={event => change('note', event.target.value)} /></Field>{error && <p role="alert" className="text-red-800">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={close} className={secondary}>Cancel</button><button className={primary} disabled={busy || (folder && !dirty)}>{busy ? 'Saving…' : folder ? 'Save folder' : 'Create folder'}</button></div></fieldset></form></Modal>;
}
function EmailEditor({ student, documents, initialKeys, onSave, onClose }) {
  const initialKind = documents.some(doc => ['Missing', 'Needs correction'].includes(doc.status)) ? 'missing' : documents.some(doc => doc.files.length) ? 'received' : 'missing';
  const [kind, setKind] = useState(initialKind), [keys, setKeys] = useState(initialKeys.length ? initialKeys : documents.filter(doc => initialKind === 'received' ? doc.files.length : ['Missing', 'Needs correction'].includes(doc.status)).map(doc => doc.key)), [deadline, setDeadline] = useState('');
  const selected = documents.filter(doc => keys.includes(doc.key));
  const initial = emailTemplate(initialKind, student, selected);
  const [form, setForm] = useState({ recipient: student.email, ...initial }), [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [eventId] = useState(() => crypto.randomUUID());
  const generate = (nextKind = kind, nextKeys = keys, nextDeadline = deadline) => { setKind(nextKind); setKeys(nextKeys); setDeadline(nextDeadline); setForm(prev => ({ ...prev, ...emailTemplate(nextKind, student, documents.filter(doc => nextKeys.includes(doc.key)), nextDeadline) })); };
  const close = () => { if (!busy && window.confirm('Close this email draft without sending?')) onClose(); };
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  return <Modal title="Email student" subtitle={student.name} size="lg" onClose={close}><div className="space-y-4">
    {!preview ? <><Field label="Template"><Select value={kind} values={['received', 'validated', 'missing', 'correction']} labels={{received: 'Documents received', validated: 'Documents validated', missing: 'Missing / extra documents', correction: 'Correction required'}} onChange={v => generate(v, documents.filter(doc => v === 'validated' ? doc.status === 'Validated' : v === 'received' ? doc.files.length > 0 : v === 'correction' ? doc.status === 'Needs correction' : doc.status === 'Missing').map(doc => doc.key))} /></Field>
      <fieldset className="max-h-40 space-y-2 overflow-auto rounded-lg border border-border p-3"><legend className="px-1 text-sm font-medium">Documents to mention</legend>{documents.map(doc => <label key={doc.key} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={kind === 'validated' && doc.status !== 'Validated' || kind === 'received' && !doc.files.length} checked={keys.includes(doc.key)} onChange={event => generate(kind, event.target.checked ? [...keys, doc.key] : keys.filter(key => key !== doc.key))} />{doc.name} <span className="text-xs text-text-muted">{doc.status}</span></label>)}{!documents.length && <p className="text-sm text-text-muted">No checklist items yet. Write a custom message below.</p>}</fieldset>
      <Field label="Requested deadline"><input type="date" className={input} value={deadline} onChange={event => generate(kind, keys, event.target.value)} /></Field><p className="text-xs text-text-muted">Changing the template, document selection or deadline regenerates the message. Customise it afterwards.</p>
      <Field label="Recipient"><input type="email" required className={input} value={form.recipient} onChange={event => change('recipient', event.target.value)} /></Field><Field label="Subject"><input className={input} maxLength={200} value={form.subject} onChange={event => change('subject', event.target.value)} /></Field><Field label="Message"><textarea rows={10} maxLength={20000} className={input} value={form.message} onChange={event => change('message', event.target.value)} /></Field></> : <div className="space-y-4 rounded-xl border border-border bg-canvas p-5"><p className="text-sm">To: <strong>{form.recipient}</strong></p><h3 className="font-semibold text-navy">{form.subject}</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{form.message}</p><p className="text-xs text-text-muted">Only this message will be sent. Internal notes and files are not attached.</p></div>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}<div className="flex justify-end gap-2"><button disabled={busy} onClick={preview ? () => setPreview(false) : close} className={secondary}>{preview ? 'Edit message' : 'Cancel'}</button>{preview ? <button disabled={busy} className={primary} onClick={async () => { setBusy(true); setError(''); try { await onSave({ action: 'email', eventId, ...form }); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>{busy ? 'Sending…' : 'Send email'}</button> : <button className={primary} disabled={!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.recipient) || !form.subject.trim() || !form.message.trim()} onClick={() => setPreview(true)}>Preview email</button>}</div>
  </div></Modal>;
}

export default function StudentDocumentsPage() {
  const { studentId } = useParams();
  const [data, setData] = useState(null), [users, setUsers] = useState(null), [error, setError] = useState(''), [usersError, setUsersError] = useState(''), [loading, setLoading] = useState(true), [updated, setUpdated] = useState(null);
  const [tab, setTab] = useState('Academic'), [query, setQuery] = useState(''), [status, setStatus] = useState(''), [selection, setSelection] = useState([]), [selectedKey, setSelectedKey] = useState(''), [modal, setModal] = useState(null), [notice, setNotice] = useState('');
  const [downloading, setDownloading] = useState(false), [downloadProgress, setDownloadProgress] = useState(''), [downloadError, setDownloadError] = useState('');
  const downloadSelection = async () => {
    if (downloading) return;
    setDownloading(true); setDownloadError(''); setDownloadProgress('Refreshing file links…');
    try {
      const fresh = await documentsApi(studentId);
      const result = await downloadDocumentZip(fresh.documents, selection, fresh.student.name, setDownloadProgress);
      setNotice(`${result.count} files downloaded (latest versions).${result.missing.length ? ` No file available for: ${result.missing.join(', ')}.` : ''}`);
    } catch (err) { setDownloadError(err.message || 'Unable to download files. Refresh and retry.'); }
    finally { setDownloading(false); setDownloadProgress(''); }
  };
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await documentsApi(studentId)); setUpdated(new Date()); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [studentId]);
  const loadUsers = useCallback(async () => { setUsersError(''); try { setUsers(await documentUsers()); } catch (err) { setUsersError(err.message); } }, []);
  useEffect(() => { setData(null); setSelection([]); setSelectedKey(''); setModal(null); load(); loadUsers(); }, [load, loadUsers]);
  usePageRefreshRegistration({ lastUpdated: updated, refresh: load, loading });
  const act = async payload => { const result = await documentsApi(studentId, payload); setNotice(result.warning || (payload.action === 'email' ? 'Email accepted by the provider.' : 'Saved to Airtable.')); await load(); return result; };
  const all = data?.documents || [];
  const docs = useMemo(() => all.filter(doc => doc.source === tab && (!status || doc.status === status) && (!query || [doc.name, doc.category, doc.note].some(value => value?.toLowerCase().includes(query.toLowerCase())))), [all, tab, status, query]);
  const selected = all.find(doc => doc.key === selectedKey);
  const sourceDocs = all.filter(doc => doc.source === tab && doc.requirement !== 'Not applicable');
  const validated = sourceDocs.filter(doc => doc.status === 'Validated').length;
  const missing = sourceDocs.filter(doc => doc.requirement === 'Required' && ['Missing', 'Needs correction'].includes(doc.status)).length;
  const folders = data?.folders.filter(folder => folder.source === tab) || [];
  return <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-8">
    <Link to="/prospects" className="text-sm text-navy hover:underline">← Back to student</Link>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={load} className="underline">Retry</button></div>}
    {notice && <div role="status" className="flex justify-between gap-3 rounded-xl border border-border bg-canvas p-4 text-sm"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
    {usersError && <p role="alert" className="text-sm text-red-800">{usersError} <button className="underline" onClick={loadUsers}>Retry users</button></p>}
    {loading && !data ? <div className="skeleton h-64 rounded-xl" aria-label="Loading documents" /> : data && <>
      <header className={`${card} flex flex-wrap items-center justify-between gap-4`}><div><p className="text-xs uppercase tracking-wide text-text-muted">Student documents · {data.student.reference || studentId}</p><h1 className="mt-1 text-2xl font-semibold text-navy">{data.student.name || 'Student'}</h1><p className="mt-2 text-sm text-text-muted">{data.student.email || 'No student email'} · {data.student.phase || 'Phase not set'}</p></div><div className="flex flex-wrap gap-2"><button data-write="" className={secondary} onClick={() => setModal({ type: 'request' })}>Request document</button><button data-write="" className={primary} onClick={() => setModal({ type: 'email' })}>Email student</button></div></header>
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-3">{[['Academic','Academic documents'],['Scholarship','Scholarship documents'],['History','History']].map(([key, label]) => <button key={key} aria-pressed={tab === key} className={`${tab === key ? primary : secondary} shrink-0`} onClick={() => { setTab(key); setQuery(''); setStatus(''); setSelection([]); setDownloadError(''); }}>{label}{key !== 'History' && <span className="ml-2 text-xs">{all.filter(doc => doc.source === key).length}</span>}</button>)}</div>
      {tab === 'History' ? <div className={card}><Activity records={data.activity} /></div> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-muted"><strong className="text-navy">{validated}</strong> / {sourceDocs.length} applicable pieces validated · <strong className={missing ? 'text-red-700' : 'text-navy'}>{missing}</strong> required pieces missing / needing correction</p>{!folders.length && <button data-write="" className={secondary} onClick={() => setModal({ type: 'folder', source: tab })}>Create {tab.toLowerCase()} folder</button>}</div>
        {folders.map(folder => { const f = folder.fields, academic = tab === 'Academic', folderStatus = f[academic ? 'Documents Status' : 'Statut dossier bourse']; return <section key={folder.id} className={card}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-navy">{academic ? f.Name || 'Academic folder' : 'Scholarship folder'}</h2><Badge value={FOLDER_STATUS_LABELS[folderStatus] || folderStatus} /><span className="text-xs text-text-muted">Submitted {fmt(f[academic ? 'Submission Date' : 'Date soumission'])}</span></div><button className={secondary} onClick={() => setModal({ type: 'folder', folder, source: tab })}>Manage folder</button></div><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-muted"><span>Responsible: {users?.assigneeLabels?.[f['Assigned User ID']] || f['Assigned User Name'] || 'Unassigned'}</span><span>Review deadline: {fmt(f['Review Deadline'])}</span>{academic && <><span>Diploma: {f['Diploma Level'] || '—'}</span><span>Field: {f['Field of Study'] || '—'}</span><span>Language: {f['Language Cert Name'] || '—'}</span><span>Passport expires: {fmt(f['Passport Expiry'])}</span></>}</div>{f['Review Note'] && <p className="mt-3 whitespace-pre-wrap text-sm">{f['Review Note']}</p>}{!academic && f['Membres du foyer'] && <details className="mt-3 text-sm"><summary className="cursor-pointer text-navy">Household information</summary><p className="mt-2 whitespace-pre-wrap">{f['Membres du foyer']}</p></details>}</section>; })}
        <section className={card}><div className="flex flex-wrap gap-2"><input aria-label="Search documents" className={`${input} min-w-0 flex-1 basis-52`} value={query} placeholder="Search files or notes…" onChange={event => setQuery(event.target.value)} /><div className="w-48"><Select label="Filter review status" value={status} values={REVIEW_STATUSES} empty="All statuses" onChange={setStatus} /></div>{selection.length > 0 && <button type="button" className={secondary} disabled={downloading} onClick={downloadSelection}>{downloading ? downloadProgress : `Download selected (${selection.length})`}</button>}{selection.length > 0 && <button data-write="" className={secondary} onClick={() => setModal({ type: 'email' })}>Email about {selection.length} selected</button>}</div>
          {downloadError && <p role="alert" className="mt-3 text-sm text-red-800">{downloadError}</p>}{downloading && <p role="status" className="mt-3 text-sm text-text-muted">{downloadProgress}</p>}<p className="mt-3 text-xs text-text-muted">Select documents to download their latest files together as a ZIP.</p><div className="mt-4 divide-y divide-border">{docs.map(doc => <article key={doc.key} className="flex items-start gap-3 py-4"><input type="checkbox" aria-label={'Select ' + doc.name} className="mt-2 h-4 w-4 accent-navy" checked={selection.includes(doc.key)} onChange={event => setSelection(prev => event.target.checked ? [...prev, doc.key] : prev.filter(key => key !== doc.key))} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><button onClick={() => setSelectedKey(doc.key)} className="break-words text-left font-medium text-navy hover:underline">{doc.name}</button><Badge value={doc.status} /><span className="text-xs text-text-muted">{doc.requirement}</span></div><p className="mt-1 text-xs text-text-muted">{doc.category} · {doc.files.length} file{doc.files.length === 1 ? '' : 's'} · {users?.assigneeLabels?.[doc.assignedTo] || doc.assignedToName || 'Unassigned'}{doc.due ? ' · Due ' + fmt(doc.due) : ''}</p>{doc.reason && <p className="mt-2 text-sm text-red-800">{doc.reason}</p>}{doc.note && <p className="mt-1 line-clamp-2 text-xs text-text-muted">Internal: {doc.note}</p>}</div><button className={secondary} onClick={() => setSelectedKey(doc.key)}>Review</button></article>)}</div>
          {!docs.length && <div className="py-12 text-center"><h3 className="font-medium text-navy">{query || status ? 'No documents match these filters.' : 'No documents in this group yet.'}</h3><p className="mt-2 text-sm text-text-muted">Add the pieces this student needs, then upload or request their files.</p><button data-write="" className={`${secondary} mt-4`} onClick={() => setModal({ type: 'request' })}>Request document</button></div>}
        </section>
      </>}
      {selected && <DocumentEditor key={selected.key + selected.updatedAt} doc={selected} activity={data.activity} users={users} onSave={act} onClose={() => setSelectedKey('')} />}
      {modal?.type === 'request' && <RequestEditor source={tab === 'Scholarship' ? tab : 'Academic'} users={users} onSave={act} onClose={() => setModal(null)} />}
      {modal?.type === 'folder' && <FolderEditor folder={modal.folder} source={modal.source} users={users} onSave={act} onClose={() => setModal(null)} />}
      {modal?.type === 'email' && <EmailEditor student={data.student} documents={all} initialKeys={selection} onSave={act} onClose={() => { setModal(null); setSelection([]); }} />}
    </>}
  </div>;
}
