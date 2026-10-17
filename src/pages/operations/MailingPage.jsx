import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { fetchProspectsForSearch } from '../../lib/airtable.js';
import { renderMailText, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_COUNT } from '../../lib/mailing.js';
import { getOnboardingDefaults, renderOnboarding, validateOnboardingVariables, ONBOARDING_TEMPLATE_ID } from '../../lib/mailingSystemTemplates.js';
import StudentPicker from '../../components/documents/StudentPicker.jsx';
import Modal from '../../components/Modal.jsx';
import { Field, ErrorMessage, inputClass, buttonClass, primaryClass } from '../../components/prospection/controls.jsx';

async function api(body, signal, studentId = '') {
  const response = await fetch(`/api/mailing${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`, { signal, cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Service Mailing indisponible.'), { partial: result.partial, templateId: result.templateId });
  return result;
}
const empty = () => ({ name: '', subject: '', body: '', cc: '', fromKey: '', attachments: [] });
const bytes = files => files.reduce((sum, file) => sum + (file.size ?? Math.floor(file.content.length * 3 / 4)), 0);
const emptyVariables = () => ({ formule: '', date_echeance: '', montant_a_payer: '' });
function HtmlPreview({ html }) {
  return <iframe title="Aperçu du mail de bienvenue JEEXPERT" sandbox="" referrerPolicy="no-referrer" srcDoc={html} className="h-[620px] w-full rounded-xl border border-border bg-white" />;
}

export default function MailingPage() {
  const { canWrite } = useAuth();
  const [students, setStudents] = useState([]), [studentId, setStudentId] = useState('');
  const [senders, setSenders] = useState([]), [templates, setTemplates] = useState([]), [history, setHistory] = useState([]);
  const [draft, setDraft] = useState(empty), [templateId, setTemplateId] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [warning, setWarning] = useState('');
  const [preview, setPreview] = useState(false), [sent, setSent] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('');
  const [context, setContext] = useState(null), [contextLoading, setContextLoading] = useState(false), [contextWarning, setContextWarning] = useState('');
  const [variables, setVariables] = useState(emptyVariables), [paymentId, setPaymentId] = useState('');
  const key = useRef(crypto.randomUUID());
  const student = students.find(item => item.id === studentId);
  const isSystem = templateId === ONBOARDING_TEMPLATE_ID;
  const onboarding = renderOnboarding({ student: context?.student || {}, variables, attachments: draft.attachments, logoSrc: '/images/jeexpert-content/logo-pdf.png' });
  const change = (field, value) => { setDraft(old => ({ ...old, [field]: value })); key.current = crypto.randomUUID(); setSent(false); setNotice(''); };
  const changeVariable = (field, value) => { setVariables(old => ({ ...old, [field]: value })); key.current = crypto.randomUUID(); setSent(false); setNotice(''); };
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [data, people] = await Promise.all([api(), fetchProspectsForSearch()]);
      setSenders(data.senders); setTemplates(data.templates); setStudents(people); setWarning(data.warning || '');
      setDraft(old => ({ ...old, fromKey: old.fromKey || data.senders[0]?.key || '' }));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setHistory([]); setHistoryStatus(''); setContext(null); setContextWarning(''); setVariables(emptyVariables()); setPaymentId(''); setContextLoading(false); if (!studentId) return;
    setContextLoading(true);
    setHistoryStatus('Chargement de l’historique…');
    const controller = new AbortController();
    api(null, controller.signal, studentId).then(data => {
      if (controller.signal.aborted) return;
      setHistory(data.history || []); setHistoryStatus(data.warning || '');
      setContext({ student: data.student, payments: data.payments || [] }); setContextWarning(data.contextWarning || '');
      setVariables(getOnboardingDefaults(data.student, data.payments || []));
      setPaymentId(data.payments?.length === 1 ? data.payments[0].id : ''); key.current = crypto.randomUUID();
    }).catch(err => { if (err.name !== 'AbortError') { setHistoryStatus(err.message); setContextWarning(err.message); } }).finally(() => { if (!controller.signal.aborted) setContextLoading(false); });
    return () => controller.abort();
  }, [studentId]);
  const chooseTemplate = id => {
    if ((draft.body || draft.subject) && !window.confirm('Remplacer le message actuel ?')) return;
    const model = templates.find(item => item.id === id);
    setTemplateId(id); setDraft(model ? { ...model, fromKey: senders.some(sender => sender.key === model.fromKey) ? model.fromKey : senders[0]?.key || '', attachments: [...model.attachments] } : { ...empty(), fromKey: senders[0]?.key || '' });
    key.current = crypto.randomUUID(); setSent(false); setNotice(''); setError('');
  };
  const addFiles = async event => {
    const files = Array.from(event.target.files || []); event.target.value = ''; setBusy(true); setError('');
    try {
      if (draft.attachments.length + files.length > MAX_ATTACHMENT_COUNT || bytes(draft.attachments) + (draft.reservedAttachmentBytes || 0) + files.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENT_BYTES) throw new Error(`${MAX_ATTACHMENT_COUNT} pièces jointes et 3 Mo au total maximum (logo inclus pour le mail de bienvenue).`);
      const added = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
        reader.onload = () => resolve({ filename: file.name, content: String(reader.result).split(',')[1] }); reader.readAsDataURL(file);
      })));
      change('attachments', [...draft.attachments, ...added]);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const saveTemplate = async update => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api({ action: 'save-template', ...(update ? { id: templateId } : {}), input: { name: draft.name, subject: draft.subject, body: draft.body, cc: draft.cc, fromKey: draft.fromKey, attachments: draft.attachments } });
      setTemplates(old => [...old.filter(item => item.id !== result.template.id), result.template]); setTemplateId(result.template.id); setDraft(result.template); setNotice('Modèle enregistré avec ses pièces jointes.');
    } catch (err) {
      setError(err.message);
      if (err.partial) {
        setTemplateId(err.templateId);
        try {
          const data = await api(); setTemplates(data.templates);
          const saved = data.templates.find(item => item.id === err.templateId);
          if (saved) { setDraft(saved); setNotice('Le modèle a été rechargé : vérifiez la liste des pièces jointes et ajoutez les fichiers manquants.'); }
        } catch { setNotice('Rechargez les données et ouvrez le modèle enregistré avant toute nouvelle sauvegarde.'); }
      }
    } finally { setBusy(false); }
  };
  const send = async () => {
    if (busy || sent) return; setBusy(true); setError('');
    try {
      if (isSystem) validateOnboardingVariables(variables);
      const result = await api({ action: 'send', studentId, subject: draft.subject, body: draft.body, cc: draft.cc, fromKey: draft.fromKey, attachments: draft.attachments, idempotencyKey: key.current, ...(isSystem ? { systemTemplateId: ONBOARDING_TEMPLATE_ID, variables } : {}) });
      setSent(true); setPreview(false); setNotice(`Email accepté par le service d’envoi pour ${student.email}.${result.warning ? ` ${result.warning}` : ''}`);
      try { const data = await api(null, undefined, studentId); setHistory(data.history || []); } catch { /* Sending succeeded; preserve the confirmation. */ }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
    <div><Link to="/operations" className="text-sm text-brand">← Operations</Link><h1 className="mt-3 text-2xl font-semibold text-text-strong">Mailing</h1><p className="mt-1 text-sm text-text-muted">Vos modèles, vos pièces jointes et vos emails personnalisés aux étudiants.</p></div>
    <ErrorMessage>{error}</ErrorMessage>
    {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {warning && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>}
    {loading ? <p role="status">Chargement de Mailing…</p> : <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-5">
        <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="font-semibold text-text-strong">Bibliothèque de modèles</h2>
          <Field label="Email type"><select className={inputClass} value={templateId} disabled={busy} onChange={event => chooseTemplate(event.target.value)}><option value="">Rédiger un nouvel email</option>{templates.map(model => <option key={model.id} value={model.id}>{model.system ? 'Système · ' : ''}{model.name}</option>)}</select></Field>
          {!templates.length && <p className="text-sm text-text-muted">Créez votre premier modèle depuis le formulaire.</p>}
          <p className="text-xs text-text-muted">Le modèle reste intact lorsque vous adaptez le message ou ses pièces jointes. Enregistrez explicitement pour le modifier.</p>
          {isSystem && <p className="rounded-lg bg-brand/10 p-3 text-xs text-brand">Modèle système HTML : identité étudiant, formule et premier paiement personnalisés. Le design d’origine est protégé.</p>}
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="font-semibold text-text-strong">Historique de l’étudiant</h2>
          {!studentId ? <p className="text-sm text-text-muted">Choisissez un étudiant pour consulter ses envois.</p> : historyStatus ? <p role="status" className="text-sm text-text-muted">{historyStatus}</p> : !history.length ? <p className="text-sm text-text-muted">Aucun envoi enregistré.</p> : <ul className="max-h-96 space-y-3 overflow-auto">{history.map(item => <li key={item.id} className="border-b border-border pb-3 text-sm"><p className="break-words font-medium">{item.subject}</p><p className="text-xs text-text-muted">{item.sentAt ? new Date(item.sentAt).toLocaleString('fr-FR') : ''}</p><p className="break-words text-xs text-text-muted">{item.actor}</p></li>)}</ul>}
        </section>
      </aside>
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault(); setError('');
          try { if (!context?.student || contextLoading) throw new Error('Attendez le chargement de la fiche étudiant.'); if (isSystem) validateOnboardingVariables(variables); setPreview(true); }
          catch (err) { setError(err.message); }
        }}>
            <StudentPicker students={students} value={studentId} disabled={busy} onChange={id => { setStudentId(id); key.current = crypto.randomUUID(); setSent(false); setNotice(''); }} />
            {student && <p className="break-words text-sm text-text-muted">À : {student.email || 'Adresse email manquante dans la fiche étudiant.'}</p>}
          <fieldset disabled={busy || !canWrite} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Expéditeur JEEXPERT"><select required className={inputClass} value={draft.fromKey} onChange={event => change('fromKey', event.target.value)}><option value="">Choisir une adresse</option>{senders.map(sender => <option key={sender.key} value={sender.key}>{sender.label} · {sender.email}</option>)}</select></Field><Field label="CC (facultatif)"><input className={inputClass} value={draft.cc} placeholder="nom@exemple.com, autre@exemple.com" onChange={event => change('cc', event.target.value)} /></Field></div>
            {!senders.length && <p className="text-sm text-amber-800">Aucune adresse d’expédition configurée.</p>}
            <Field label="Objet"><input required maxLength={200} className={inputClass} value={draft.subject} onChange={event => change('subject', event.target.value)} /></Field>
            {isSystem ? <div className="space-y-4">
              <h2 className="font-semibold text-text-strong">Informations du mail de bienvenue</h2>
              {contextLoading && <p role="status" className="text-sm text-text-muted">Chargement de la fiche et des paiements…</p>}
              {contextWarning && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{contextWarning}</p>}
              {context?.student && <p className="break-words text-sm text-text-muted">Prénom : {context.student.firstName || '—'} · Nom : {context.student.lastName || '—'} · Email : {context.student.email}</p>}
              <Field label="Formule"><input required disabled={contextLoading} maxLength={1000} className={inputClass} value={variables.formule} onChange={event => changeVariable('formule', event.target.value)} placeholder="Reprise des services sélectionnés dans Proposal" /></Field>
              {!!context?.payments.length && <Field label="Préremplir depuis un paiement à régler en DT"><select disabled={contextLoading} className={inputClass} value={paymentId} onChange={event => {
                const id = event.target.value, payment = context.payments.find(item => item.id === id);
                setPaymentId(id); setVariables(old => ({ ...old, date_echeance: payment?.dueDate || '', montant_a_payer: payment ? String(payment.amount) : '' })); key.current = crypto.randomUUID(); setSent(false); setNotice('');
              }}><option value="">Saisie manuelle / choisir un paiement</option>{context.payments.map(payment => <option key={payment.id} value={payment.id}>{payment.amount} DT · {payment.dueDate || 'Sans échéance'}</option>)}</select></Field>}
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Échéance"><input required disabled={contextLoading} type="date" className={inputClass} value={variables.date_echeance} onChange={event => changeVariable('date_echeance', event.target.value)} /></Field><Field label="Montant à payer (DT)"><input required disabled={contextLoading} type="number" min="0.001" step="0.001" className={inputClass} value={variables.montant_a_payer} onChange={event => changeVariable('montant_a_payer', event.target.value)} /></Field></div>
              <p className="text-xs text-text-muted">Les données sont préremplies quand elles existent. Vérifiez-les avant envoi. Ces ajustements concernent uniquement cet email.</p>
            </div> : <>
              <Field label="Message"><textarea required rows={10} maxLength={20000} className={inputClass} value={draft.body} onChange={event => change('body', event.target.value)} /></Field>
              <p className="text-xs text-text-muted">Texte simple. Variables disponibles : {'{{fullName}}, {{firstName}}, {{email}}'}. Elles seront remplacées pour l’étudiant choisi.</p>
            </>}
            <div className="space-y-2"><Field label="Pièces jointes"><input type="file" multiple onChange={addFiles} className="block w-full text-sm" /></Field><p className="text-xs text-text-muted">{isSystem ? `${MAX_ATTACHMENT_COUNT} fichiers, 3 Mo au total, logo inclus. Les pièces ajoutées concernent cet envoi uniquement.` : `${MAX_ATTACHMENT_COUNT} fichiers, 3 Mo au total maximum. Les fichiers sont conservés dans le modèle uniquement après enregistrement.`}</p>
              <ul className="space-y-2">{draft.attachments.map((file, index) => <li key={`${index}-${file.filename}`} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm"><span className="break-all">{file.filename}</span><button type="button" className={buttonClass} aria-label={`Retirer ${file.filename}`} onClick={() => change('attachments', draft.attachments.filter((_, i) => i !== index))}>Retirer</button></li>)}</ul>
            </div>
            {isSystem && <p className="rounded-lg bg-canvas p-3 text-xs text-text-muted">Documents à ajouter selon le dossier : brochure, fiche étudiant, règlement intérieur, facture et guide de la plateforme. La liste des cinq documents est fixe dans le mail ; les fichiers ne sont pas générés automatiquement.</p>}
            {!isSystem && <div className="border-t border-border pt-4"><Field label="Nom du modèle (pour enregistrer)"><input maxLength={100} className={inputClass} value={draft.name} onChange={event => change('name', event.target.value)} placeholder="Ex. Documents à fournir pour le visa" /></Field>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={!draft.name.trim() || !draft.subject.trim() || !draft.body.trim()} onClick={() => saveTemplate(false)}>Enregistrer comme nouveau modèle</button>{templateId && <button type="button" className={buttonClass} disabled={!draft.name.trim()} onClick={() => saveTemplate(true)}>Mettre à jour le modèle</button>}</div>
            </div>}
          </fieldset>
          {isSystem && <div className="space-y-2"><h2 className="text-sm font-semibold text-text-strong">Aperçu du design HTML</h2><HtmlPreview html={onboarding.html} /></div>}
          {!canWrite && <p className="text-sm text-text-muted">Votre rôle permet la consultation uniquement.</p>}
          <div className="flex justify-end"><button className={primaryClass} disabled={busy || !canWrite || !student?.email || !draft.fromKey || sent || contextLoading || !context?.student}>Aperçu avant envoi</button></div>
        </form>
      </section>
    </div>}
    {!loading && error && <button className={buttonClass} disabled={busy} onClick={load}>Recharger les données</button>}
    {preview && <Modal title="Vérifier l’email avant envoi" onClose={() => { if (!busy) setPreview(false); }}><div className="space-y-4">
      <p className="break-words text-sm"><strong>De :</strong> {senders.find(item => item.key === draft.fromKey)?.email}<br /><strong>À :</strong> {student?.fullName} · {student?.email}{draft.cc && <><br /><strong>CC :</strong> {draft.cc}</>}</p>
      <h3 className="break-words font-semibold">{renderMailText(draft.subject, context?.student || student || {})}</h3>{isSystem ? <HtmlPreview html={onboarding.html} /> : <p className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-canvas p-4 text-sm">{renderMailText(draft.body, context?.student || student || {})}</p>}
      <p className="break-words text-sm">Pièces jointes : {draft.attachments.map(file => file.filename).join(', ') || 'Aucune'}</p><ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2"><button disabled={busy} className={buttonClass} onClick={() => setPreview(false)}>Modifier</button><button disabled={busy || sent} className={primaryClass} onClick={send}>{busy ? 'Envoi…' : 'Envoyer l’email'}</button></div>
    </div></Modal>}
  </div>;
}
