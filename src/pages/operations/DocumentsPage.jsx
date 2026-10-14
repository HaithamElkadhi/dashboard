import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePageRefreshRegistration } from '../../contexts/PageRefreshContext.jsx';
import { fetchProspectsForSearch } from '../../lib/airtable.js';
import { downloadDocumentFile, downloadDocumentZip } from '../../lib/documentDownload.js';
import Modal from '../../components/Modal.jsx';
import StudentPicker from '../../components/documents/StudentPicker.jsx';
import DocumentPreviewDialog from '../../components/documents/DocumentPreviewDialog.jsx';
import { buttonClass, primaryClass, inputClass, Field, ErrorMessage } from '../../components/prospection/controls.jsx';

const groups = { Visa: 'Visa', Scholarship: 'Scholarship', Academic: 'Admission' };
export async function workspaceApi(studentId, body, signal) {
  const response = await fetch(`/api/documents-workspace?studentId=${encodeURIComponent(studentId)}`, { signal, cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossible de charger les documents.');
  return data;
}

function EmailDocuments({ student, documents, onClose, onSent }) {
  const [subject, setSubject] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const eventId = useRef(crypto.randomUUID());
  const close = () => { if (!busy && (sent || !subject && !message || window.confirm('Abandonner cet email non envoyé ?'))) onClose(); };
  const send = async event => {
    event.preventDefault(); if (busy || sent) return;
    setBusy(true); setError('');
    try {
      const result = await workspaceApi(student.id, { action: 'email', recipient: student.email, subject, message, keys: documents.map(doc => doc.key), eventId: eventId.current });
      setSent(true); setNotice(result.warning || ''); onSent();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title="Envoyer les documents par email" onClose={close}>
    {sent ? <div className="space-y-4"><p role="status">Email envoyé à {student.email}.</p>{notice && <p role="status">{notice}</p>}<button className={buttonClass} onClick={onClose}>Fermer</button></div> : <form onSubmit={send} className="space-y-4">
      <p className="break-words text-sm">Destinataire : <strong>{student.email || 'Adresse email manquante'}</strong></p>
      <div className="rounded-lg bg-canvas p-3 text-sm"><p className="font-medium">Pièces jointes ({documents.length})</p><ul className="max-h-40 overflow-y-auto list-disc pl-5">{documents.map(doc => <li key={doc.key} className="break-words">{doc.files[0]?.filename || doc.name}</li>)}</ul><p className="mt-2 text-xs">La version actuelle de chaque document sera jointe.</p></div>
      <fieldset disabled={busy} className="space-y-4">
        <Field label="Objet"><input required maxLength={200} className={inputClass} value={subject} onChange={event => { setSubject(event.target.value); eventId.current = crypto.randomUUID(); }} /></Field>
        <Field label="Corps du message"><textarea required rows={7} maxLength={20000} className={inputClass} value={message} onChange={event => { setMessage(event.target.value); eventId.current = crypto.randomUUID(); }} /></Field>
      </fieldset><ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={buttonClass} onClick={close}>Annuler</button><button className={primaryClass} disabled={busy || !student.email}>{busy ? 'Envoi…' : 'Envoyer'}</button></div>
    </form>}
  </Modal>;
}

function DocumentDialog({ studentId, source, doc, onClose, onSaved }) {
  const [comment, setComment] = useState(''), [name, setName] = useState(doc?.name || '');
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const created = useRef(null);
  const close = () => { if (!busy && (!comment && !file && (doc || !name) || window.confirm('Abandonner les modifications ?'))) onClose(); };
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (file && file.size > 3 * 1024 * 1024) { setError('3 Mo maximum par fichier.'); return; }
    setBusy(true); setError('');
    try {
      if (doc && comment.trim()) await workspaceApi(studentId, { action: 'comment', key: doc.key, comment, expectedUpdatedAt: doc.updatedAt });
      if (!doc && !created.current) {
        const result = await workspaceApi(studentId, { action: 'request', source, name, note: comment, requirement: 'Required' });
        created.current = result.record;
      }
      if (file) {
        const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Impossible de lire le fichier.')); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file); });
        const current = created.current;
        await workspaceApi(studentId, { action: 'upload', key: doc?.key || current.fields['Document Key'], expectedUpdatedAt: doc?.updatedAt || current.fields['Updated At'], filename: file.name, contentType: file.type, file: content });
      }
      await onSaved(); onClose();
    } catch (err) { setError(err.message + (created.current ? ' Le document a été créé ; vous pouvez réessayer le dépôt.' : '')); } finally { setBusy(false); }
  };
  return <Modal title={doc ? doc.name : `Ajouter un document ${groups[source]}`} onClose={close}>
    <form onSubmit={submit} className="space-y-4">
      {doc?.note && <div className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-canvas p-3 text-sm">{doc.note}</div>}
      <fieldset disabled={busy} className="space-y-4">
        {!doc && <Field label="Nom du document"><input required maxLength={200} className={inputClass} value={name} onChange={event => setName(event.target.value)} disabled={!!created.current} /></Field>}
        <Field label="Commentaire interne"><textarea required={!!doc} rows={4} maxLength={5000} className={inputClass} value={comment} onChange={event => setComment(event.target.value)} /></Field>
        {!doc && <Field label="Fichier"><input required type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={event => setFile(event.target.files?.[0] || null)} /><small className="block text-text-muted">PDF, image ou Word — 3 Mo maximum.</small></Field>}
      </fieldset><ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={buttonClass} onClick={close}>Annuler</button><button className={primaryClass} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  </Modal>;
}

export default function DocumentsPage() {
  const { canWrite } = useAuth();
  const [source, setSource] = useState('Academic'), [students, setStudents] = useState([]), [studentId, setStudentId] = useState('');
  const [data, setData] = useState(null), [selected, setSelected] = useState([]), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [progress, setProgress] = useState(''), [lastUpdated, setLastUpdated] = useState(null);
  const [dialog, setDialog] = useState(null), [email, setEmail] = useState(null), [deleting, setDeleting] = useState(false), [searchError, setSearchError] = useState('');
  const [previewKey, setPreviewKey] = useState(null);
  const generation = useRef(0);
  const loadStudents = useCallback(async () => { try { setSearchError(''); setStudents(await fetchProspectsForSearch()); } catch (err) { setSearchError(err.message); } }, []);
  useEffect(() => { loadStudents(); }, [loadStudents]);
  const load = useCallback(async () => {
    if (!studentId) return;
    const current = ++generation.current; setLoading(true); setError('');
    try { const result = await workspaceApi(studentId); if (current === generation.current) { setData(result); setLastUpdated(new Date()); setSelected([]); } }
    catch (err) { if (current === generation.current) setError(err.message); }
    finally { if (current === generation.current) setLoading(false); }
  }, [studentId]);
  useEffect(() => { setData(null); setSelected([]); setNotice(''); setPreviewKey(null); load(); return () => { generation.current++; }; }, [load]);
  usePageRefreshRegistration({ lastUpdated, refresh: dialog || email || deleting || busy || previewKey ? null : load, loading });
  const documents = (data?.documents || []).filter(doc => doc.source === source);
  const files = documents.filter(doc => doc.files[0]?.url);
  const chosen = documents.filter(doc => selected.includes(doc.key));
  const blocked = busy || loading;
  const download = async keys => {
    setBusy(true); setError(''); setNotice('');
    try { const result = await downloadDocumentZip(documents, keys, data.student.name, setProgress); setNotice(`${result.count} document(s) téléchargé(s).`); }
    catch (err) { setError(err.message); } finally { setBusy(false); setProgress(''); }
  };
  const downloadOne = async file => {
    setBusy(true); setError('');
    try { await downloadDocumentFile(file); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError('');
    try {
      const result = await workspaceApi(studentId, { action: 'delete', keys: selected, expected: chosen.map(doc => ({ key: doc.key, updatedAt: doc.updatedAt, fileIds: doc.files.map(file => file.id) })) });
      setDeleting(false); await load(); setNotice(result.warning || 'Documents supprimés.');
    } catch (err) { setDeleting(false); await load(); setError(`${err.message} Vérifiez la liste actualisée avant de réessayer.`); }
    finally { setBusy(false); }
  };
  const preview = data?.documents.find(doc => doc.key === previewKey);
  const saveComment = async comment => {
    const result = await workspaceApi(studentId, { action: 'comment', key: preview.key, comment, expectedUpdatedAt: preview.updatedAt });
    await load(); if (result.warning) setNotice(result.warning);
  };
  return <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-8">
    <Link to="/operations" className="text-sm text-brand hover:underline">← Operations</Link>
    <div><h1 className="text-2xl font-semibold text-navy">Documents</h1><p className="mt-1 text-sm text-text-muted">Les documents Visa, Scholarship et Admission de vos étudiants.</p></div>
    <nav aria-label="Sections de documents" className="grid gap-3 sm:grid-cols-3">{Object.entries(groups).map(([key, label]) => <button type="button" key={key} disabled={blocked} aria-pressed={source === key} className={`${source === key ? primaryClass : buttonClass} min-h-16`} onClick={() => { setSource(key); setSelected([]); setNotice(''); }}>{label}{data ? ` (${data.documents.filter(doc => doc.source === key).length})` : ''}</button>)}</nav>
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <StudentPicker students={students} value={studentId} disabled={blocked} onChange={setStudentId} />
      {searchError && <div><ErrorMessage>{searchError}</ErrorMessage><button className={buttonClass} onClick={loadStudents}>Réessayer</button></div>}
    </section>
    <ErrorMessage>{error}</ErrorMessage>{notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}{progress && <p role="status">{progress}</p>}
    {loading ? <p role="status">Chargement des documents…</p> : !studentId ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-text-muted">Choisissez un étudiant pour afficher ses documents.</p> : data ? <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">{groups[source]} — {data.student.name}</h2><p className="text-sm text-text-muted">{documents.length} document(s) · {selected.length} sélectionné(s)</p></div><div className="flex gap-2"><button className={buttonClass} disabled={blocked} onClick={load}>Actualiser</button>{canWrite && <button className={primaryClass} disabled={blocked} onClick={() => setDialog({})}>+ Ajouter un document</button>}</div></div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={buttonClass} disabled={blocked || !files.length} onClick={() => setSelected(selected.length === files.length ? [] : files.map(doc => doc.key))}>{selected.length === files.length && files.length ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
        <button className={buttonClass} disabled={blocked || !chosen.length} onClick={() => download(selected)}>Télécharger la sélection (ZIP)</button>
        <button className={buttonClass} disabled={blocked || !files.length} onClick={() => download(files.map(doc => doc.key))}>Tout télécharger (ZIP)</button>
        {canWrite && <><button className={buttonClass} disabled={blocked || !chosen.length || chosen.length > 30} onClick={() => setEmail(chosen)}>Envoyer par email</button><button className={`${buttonClass} text-red-700`} disabled={blocked || !chosen.length || chosen.length > 50} onClick={() => setDeleting(true)}>Supprimer</button></>}
      </div>
      {!documents.length ? <div className="space-y-3 py-8 text-center text-text-muted"><p>Aucun document {groups[source]} pour cet étudiant.</p>{Object.entries(groups).filter(([key]) => key !== source && data.documents.some(doc => doc.source === key)).map(([key, label]) => <button key={key} className={buttonClass} onClick={() => { setSource(key); setSelected([]); }}>Voir {data.documents.filter(doc => doc.source === key).length} document(s) dans {label}</button>)}</div> : <ul className="divide-y divide-border">{documents.map(doc => <li key={doc.key} className="flex flex-wrap items-start gap-3 py-4">
        <input type="checkbox" aria-label={`Sélectionner ${doc.name}`} checked={selected.includes(doc.key)} disabled={blocked || !doc.files[0]?.url} className="mt-1 h-5 w-5" onChange={event => setSelected(old => event.target.checked ? [...old, doc.key] : old.filter(key => key !== doc.key))} />
        <div className="min-w-0 flex-1"><p className="break-words font-medium text-text-strong">{doc.name}</p><p className="text-xs text-text-muted">{doc.files[0]?.filename || 'Fichier manquant'}{doc.files[0]?.size ? ` · ${Math.ceil(doc.files[0].size / 1024)} Ko` : ''}</p>{doc.note && <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-sm text-text-muted">{doc.note}</p>}</div>
        <div className="flex flex-wrap gap-2">{doc.files[0]?.url?.startsWith('https://') && <><button className={buttonClass} disabled={blocked} onClick={() => setPreviewKey(doc.key)}>Ouvrir</button><button className={buttonClass} disabled={blocked} onClick={() => downloadOne(doc.files[0])}>Télécharger</button></>}{canWrite && <button className={buttonClass} disabled={blocked} onClick={() => setPreviewKey(doc.key)}>Commenter</button>}</div>
      </li>)}</ul>}
      <p className="text-xs text-text-muted">Les téléchargements et emails utilisent la version actuelle. ZIP : 100 Mo maximum ; email : 30 documents et 25 Mo maximum. Les commentaires restent internes.</p>
    </section> : error && <button className={buttonClass} onClick={load}>Recharger les documents</button>}
    {preview && <DocumentPreviewDialog key={preview.key} doc={preview} canWrite={canWrite} onClose={() => setPreviewKey(null)} onComment={saveComment} onDownload={downloadDocumentFile} />}
    {dialog && data && <DocumentDialog studentId={studentId} source={source} doc={dialog.doc} onClose={() => setDialog(null)} onSaved={load} />}
    {email && data && <EmailDocuments student={data.student} documents={email} onClose={() => setEmail(null)} onSent={load} />}
    {deleting && <Modal title="Supprimer les documents sélectionnés ?" onClose={() => { if (!busy) setDeleting(false); }}><div className="space-y-4"><p>Les {chosen.length} documents sélectionnés, leurs versions et commentaires seront supprimés d’Airtable. Cette action est définitive.</p><ul className="max-h-48 overflow-auto list-disc pl-5">{chosen.map(doc => <li key={doc.key}>{doc.name}</li>)}</ul><div className="flex justify-end gap-2"><button className={buttonClass} disabled={busy} onClick={() => setDeleting(false)}>Annuler</button><button className={`${buttonClass} text-red-700`} disabled={busy} onClick={remove}>{busy ? 'Suppression…' : 'Supprimer'}</button></div></div></Modal>}
  </div>;
}
