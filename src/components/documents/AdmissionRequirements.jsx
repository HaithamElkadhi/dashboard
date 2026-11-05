import { useCallback, useEffect, useId, useState } from 'react';
import Modal from '../Modal.jsx';
import { TrashIcon } from '../icons.jsx';
import { buttonClass, primaryClass, inputClass, Field, ErrorMessage } from '../prospection/controls.jsx';
import { ACADEMIC_LEVEL_OPTIONS, DIPLOMAS, GAP_TYPES, buildAdmissionRequirements, validateAdmissionProfile } from '../../lib/admissionRequirements.js';

const categories = { general: 'Documents communs', academic: 'Documents académiques', private: 'Établissement privé', experience: 'Expérience / années de gap' };
async function api(studentId, body, signal) {
  const response = await fetch(`/api/admission-documents?studentId=${encodeURIComponent(studentId)}&checklist=1`, {
    signal, cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, ...body }) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Impossible de charger la checklist Admission.');
  return result;
}

function DocumentList({ documents, received, onChange, disabled }) {
  return <div className="overflow-hidden rounded-xl border border-border">
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Checklist des documents d’admission</caption>
      <thead className="bg-canvas text-xs text-text-muted"><tr><th scope="col" className="w-14 px-3 py-3 text-center">Reçu</th><th scope="col" className="py-3 pr-3">Document</th><th scope="col" className="px-3 py-3 text-right">Priorité</th></tr></thead>
      {Object.entries(categories).map(([category, label]) => {
        const rows = documents.filter(doc => doc.category === category);
        return rows.length ? <tbody key={category} className="divide-y divide-border">
          <tr className="bg-canvas/60"><th colSpan={3} className="px-4 py-2 text-xs font-semibold text-navy">{label}<span className="ml-2 font-normal text-text-muted">{rows.length}</span></th></tr>
          {rows.map(doc => <tr key={doc.id} className={received.includes(doc.id) ? 'bg-green-50/40' : 'hover:bg-canvas/40'}>
            <td className="text-center"><label className="inline-flex min-h-11 w-12 items-center justify-center"><span className="sr-only">{doc.name}</span><input type="checkbox" className="h-4 w-4 accent-navy" disabled={disabled} checked={received.includes(doc.id)} onChange={() => onChange(doc.id)} /></label></td>
            <td className="py-3 pr-2 text-text-strong">{doc.name}</td>
            <td className="px-3 py-3 text-right text-xs">{doc.urgency === 'Urgent' ? <span className="inline-block rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-900">Urgent</span> : <span className="text-text-muted">{doc.urgency || '—'}</span>}</td>
          </tr>)}
        </tbody> : null;
      })}
    </table>
  </div>;
}

function DiplomaTable({ diplomas, disabled, onUpdate, onRemove, onAdd }) {
  return <section className="min-w-0 max-w-full space-y-3" aria-label="Diplômes obtenus">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-navy">Diplômes obtenus <span className="ml-1 font-normal text-text-muted">({diplomas.length})</span></h3><p className="mt-1 text-xs text-text-muted">Une ligne par diplôme, y compris les diplômes précédents.</p></div><button type="button" className={buttonClass} disabled={disabled || diplomas.length >= DIPLOMAS.length} onClick={onAdd}>+ Ajouter un diplôme</button></div>
    <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Tableau des diplômes, défilement horizontal sur petit écran">
      <table className="w-full min-w-[680px] table-fixed text-left text-sm">
        <caption className="sr-only">Diplômes obtenus, domaines étudiés et établissements</caption>
        <thead className="bg-canvas text-xs text-text-muted"><tr><th scope="col" className="w-10 py-3 text-center">#</th><th scope="col" className="w-[30%] px-2 py-3">Diplôme obtenu *</th><th scope="col" className="px-2 py-3">Domaine étudié *</th><th scope="col" className="w-[21%] px-2 py-3">Établissement *</th><th scope="col" className="w-14 py-3"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-border">{diplomas.map((diploma, index) => <tr key={index} className="bg-surface hover:bg-canvas/40">
          <td className="text-center text-xs tabular-nums text-text-muted">{index + 1}</td>
          <td className="px-2 py-2"><select required aria-label={`Diplôme obtenu ${index + 1}`} className={inputClass} value={diploma.type} onChange={event => onUpdate(index, { type: event.target.value })}><option value="">Choisir un diplôme</option>{DIPLOMAS.map(option => <option key={option.id} value={option.id} disabled={diplomas.some((row, rowIndex) => rowIndex !== index && row.type === option.id)}>{option.label}</option>)}</select></td>
          <td className="px-2 py-2"><input required aria-label={`Domaine étudié ${index + 1}`} maxLength={300} className={inputClass} value={diploma.fieldOfStudy} onChange={event => onUpdate(index, { fieldOfStudy: event.target.value })} placeholder="Ex. Informatique" /></td>
          <td className="px-2 py-2"><select required aria-label={`Établissement d’obtention ${index + 1}`} className={inputClass} value={diploma.institutionType} onChange={event => onUpdate(index, { institutionType: event.target.value })}><option value="">Choisir…</option><option value="public">Public</option><option value="private">Privé</option></select></td>
          <td className="py-2 text-center"><button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-50" aria-label={`Retirer le diplôme ${index + 1}`} onClick={() => onRemove(index)}><TrashIcon size={16} /></button></td>
        </tr>)}</tbody>
      </table>
      {!diplomas.length && <p className="p-6 text-center text-sm text-text-muted">Ajoutez un diplôme pour commencer.</p>}
    </div>
    <p className="text-xs text-text-muted sm:hidden">Faites défiler le tableau pour voir toutes les colonnes.</p>
  </section>;
}

function RequirementsEditor({ studentId, data, canWrite, onClose, onSaved }) {
  const [form, setForm] = useState(() => structuredClone(data.profile));
  const [step, setStep] = useState('profile');
  const formId = useId();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(data.profile);
  const documents = buildAdmissionRequirements(form);
  const change = patch => setForm(previous => {
    const next = { ...previous, ...patch };
    const before = new Map(buildAdmissionRequirements(previous).map(doc => [doc.id, doc.name]));
    const after = new Map(buildAdmissionRequirements(next).map(doc => [doc.id, doc.name]));
    next.received = next.received.filter(id => after.has(id) && before.get(id) === after.get(id));
    return next;
  });
  const updateDiploma = (index, patch) => change({ diplomas: form.diplomas.map((diploma, row) => row === index ? { ...diploma, ...patch } : diploma) });
  const close = () => { if (!busy && (!dirty || window.confirm('Abandonner les modifications non enregistrées ?'))) onClose(); };
  const submit = async event => {
    event.preventDefault(); if (busy || !canWrite) return;
    try { validateAdmissionProfile(form); } catch (err) { setError(err.message); setStep('profile'); return; }
    setBusy(true); setError('');
    try { onSaved(await api(studentId, { action: 'save-checklist', profile: form, expected: data.expected })); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const steps = [{ id: 'profile', label: 'Parcours', detail: form.diplomas.length }, { id: 'documents', label: 'Documents', detail: documents.length }];
  const footer = <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs text-text-muted">{!canWrite ? 'Consultation seule' : dirty ? 'Modifications non enregistrées' : data.configured ? 'Dossier enregistré' : 'Nouveau dossier'}</p>
    <div className="flex gap-2"><button type="button" disabled={busy} className={buttonClass} onClick={close}>{canWrite ? 'Annuler' : 'Fermer'}</button>{canWrite && <button type="submit" form={formId} className={primaryClass} disabled={busy || !form.diplomas.length || data.configured && !dirty}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>}</div>
  </div>;
  return <Modal title="Required document" subtitle="Admission · Parcours et pièces à collecter" size="xl" onClose={close} footer={footer}>
    <form id={formId} noValidate onSubmit={submit} className="min-w-0 space-y-5">
      <nav aria-label="Sections du dossier" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-canvas p-1">
        {steps.map((item, index) => <button key={item.id} type="button" aria-pressed={step === item.id} onClick={() => setStep(item.id)} className={`flex min-h-11 flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy sm:text-sm ${step === item.id ? 'bg-navy text-white shadow-sm' : 'text-text-muted hover:bg-surface hover:text-navy'}`}><span className="hidden sm:inline">0{index + 1}</span>{item.label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${step === item.id ? 'bg-white/15' : 'bg-surface'}`}>{item.detail}</span></button>)}
      </nav>
      <ErrorMessage>{error}</ErrorMessage>
      {step === 'profile' && <fieldset disabled={busy || !canWrite} className="min-w-0 space-y-6">
        <legend className="sr-only">Parcours académique</legend>
        <div><h3 className="mb-3 text-sm font-semibold text-navy">Parcours académique</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Dernier niveau académique *"><select required className={inputClass} value={form.academicLevel} onChange={event => change({ academicLevel: event.target.value })}><option value="">Choisir un niveau</option>{ACADEMIC_LEVEL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Domaine des études précédentes"><input className={inputClass} maxLength={1000} value={form.fieldOfStudy} onChange={event => change({ fieldOfStudy: event.target.value })} placeholder="Ex. Informatique" /></Field></div></div>
        <DiplomaTable diplomas={form.diplomas} disabled={busy || !canWrite} onUpdate={updateDiploma} onRemove={index => change({ diplomas: form.diplomas.filter((_, row) => row !== index) })} onAdd={() => change({ diplomas: [...form.diplomas, { type: '', fieldOfStudy: '', institutionType: '' }] })} />
        {form.diplomas.some(diploma => diploma.type === 'Engineering Degree') && <div className="rounded-xl border border-border bg-canvas p-4"><Field label="Voie du diplôme d’ingénieur *"><select required className={inputClass} value={form.engineeringRoute} onChange={event => change({ engineeringRoute: event.target.value })}><option value="">Choisir la voie</option><option value="licence">Licence → Master / Ingénieur (Cas 3)</option><option value="prepa">Prépa → Cycle ingénieur (Cas 4)</option></select></Field></div>}
        <fieldset className="space-y-3 border-t border-border pt-5"><legend className="text-sm font-semibold text-navy">Expérience / années de gap</legend><p className="text-xs text-text-muted">Sélectionnez les situations à justifier.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{GAP_TYPES.map(gap => <label key={gap.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${form.gaps.includes(gap.id) ? 'border-navy bg-canvas text-navy' : 'border-border text-text-muted'}`}><input type="checkbox" className="h-4 w-4 accent-navy" checked={form.gaps.includes(gap.id)} onChange={event => change({ gaps: event.target.checked ? [...form.gaps, gap.id] : form.gaps.filter(id => id !== gap.id) })} />{gap.label}</label>)}</div>{form.gaps.includes('other') && <Field label="Autre justificatif *"><input required maxLength={200} className={inputClass} value={form.otherGap} onChange={event => change({ otherGap: event.target.value })} /></Field>}</fieldset>
        <p className="text-xs text-text-muted">* Champs obligatoires. La liste des pièces s’adapte à vos réponses.</p>
      </fieldset>}
      {step === 'documents' && <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-navy">Pièces à collecter</h3><p className="mt-1 text-xs text-text-muted">Cochez les pièces reçues ; les fichiers se déposent dans Documents.</p></div><span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-navy">{form.received.length} / {documents.length} reçues</span></div>
        {form.diplomas.some(diploma => ['BTS', 'BTP'].includes(diploma.type)) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">BTS / BTP : les pièces spécifiques ne sont pas détaillées dans la checklist de référence. À confirmer auprès de l’université.</p>}
        <DocumentList documents={documents} received={form.received} disabled={busy || !canWrite} onChange={id => change({ received: form.received.includes(id) ? form.received.filter(value => value !== id) : [...form.received, id] })} />
        <p className="text-xs text-text-muted">Base interne de collecte. Chaque université peut demander des pièces supplémentaires.</p>
      </section>}
    </form>
  </Modal>;
}

export default function AdmissionRequirements({ studentId, open, onClose, canWrite }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(previous => previous + 1), []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    api(studentId, null, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [studentId, revision, open]);
  const content = <>{loading && <p role="status" className="text-sm text-text-muted">Chargement des documents requis…</p>}<ErrorMessage>{error}</ErrorMessage>{error && <button className={`${buttonClass} mt-3`} onClick={retry}>Réessayer</button>}</>;
  if (!open) return null;
  return !data || loading || error
    ? <Modal title="Required document" onClose={onClose}>{content}</Modal>
    : <RequirementsEditor studentId={studentId} data={data} canWrite={canWrite} onClose={onClose} onSaved={result => { setData(result); onClose(); }} />;
}