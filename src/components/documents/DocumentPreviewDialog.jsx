import { lazy, Suspense, useState } from 'react';
import Modal from '../Modal.jsx';
import { buttonClass, primaryClass, inputClass, Field, ErrorMessage } from '../prospection/controls.jsx';

const PdfPreview = lazy(() => import('./PdfPreview.jsx'));

export default function DocumentPreviewDialog({ doc, canWrite, onClose, onComment, onDownload }) {
  const [version, setVersion] = useState(0), [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const file = doc.files[Math.min(version, doc.files.length - 1)];
  const url = file?.url?.startsWith('https://') ? file.url : '';
  const pdf = file?.type === 'application/pdf' || /\.pdf$/i.test(file?.filename || '');
  const image = file?.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file?.filename || '');
  const close = () => { if (!busy && (!comment.trim() || window.confirm('Abandonner le commentaire non enregistré ?'))) onClose(); };
  const save = async event => {
    event.preventDefault(); if (busy || !comment.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try { await onComment(comment); setComment(''); setNotice('Commentaire enregistré.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const download = async () => {
    setBusy(true); setError('');
    try { await onDownload(file); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title={doc.name} subtitle="Aperçu du document et commentaires internes" size="xl" onClose={close}>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <section className="min-w-0 space-y-3" aria-label="Aperçu du document">
        {doc.files.length > 1 && <Field label="Version"><select className={inputClass} value={version} onChange={event => setVersion(Number(event.target.value))}>{doc.files.map((item, index) => <option key={item.id || index} value={index}>{index === 0 ? 'Version actuelle · ' : ''}{item.filename}</option>)}</select></Field>}
        <p className="break-words text-sm text-text-muted">{file?.filename || 'Aucun fichier disponible'}</p>
        {!url ? <p className="rounded-lg bg-canvas p-6 text-sm">Ce fichier n’est pas disponible. Actualisez la liste.</p> : pdf ? <Suspense fallback={<p role="status">Chargement de l’aperçu PDF…</p>}><PdfPreview url={url} name={file.filename || doc.name} /></Suspense> : image ? <img key={url} src={url} alt={file.filename || doc.name} className="max-h-[65vh] w-full rounded-lg border border-border object-contain" onError={event => { event.currentTarget.style.display = 'none'; setError('Aperçu indisponible. Téléchargez le document ou actualisez la liste.'); }} /> : <p className="rounded-lg bg-canvas p-6 text-sm">L’aperçu de ce format n’est pas disponible. Téléchargez le document pour le consulter.</p>}
        {url && <button className={buttonClass} disabled={busy} onClick={download}>Télécharger cette version</button>}
      </section>
      <section className="min-w-0 space-y-4 rounded-xl border border-border bg-canvas/40 p-4" aria-label="Commentaires du document">
        <h3 className="font-semibold text-navy">Commentaires</h3>
        {doc.note ? <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm text-text-strong">{doc.note}</div> : <p className="text-sm text-text-muted">Aucun commentaire pour ce document.</p>}
        {canWrite && <form onSubmit={save} className="space-y-3"><Field label="Ajouter un commentaire"><textarea required rows={4} maxLength={5000} className={inputClass} value={comment} disabled={busy} onChange={event => setComment(event.target.value)} /></Field><button className={primaryClass} disabled={busy || !comment.trim()}>{busy ? 'Enregistrement…' : 'Enregistrer le commentaire'}</button></form>}
        <ErrorMessage>{error}</ErrorMessage>{notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
      </section>
    </div>
  </Modal>;
}
