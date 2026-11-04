import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FileTextIcon } from '../components/icons.jsx';
import { academicPaths, commonDocuments, consultantChecks, experienceDocuments } from '../lib/admissionChecklist.js';

const input = 'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-navy';
const card = 'rounded-xl border border-border bg-surface p-5 sm:p-6';
const button = 'inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-navy hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy';
function Field({ label, children }) { return <label className="block space-y-2 text-sm font-medium text-text-strong"><span>{label}</span>{children}</label>; }

export default function ProspectDocumentsPage() {
  const { studentId } = useParams();
  return <DocumentsWorkspace key={studentId} studentId={studentId} />;
}

function DocumentsWorkspace({ studentId }) {
  const [params, setParams] = useSearchParams();
  const section = ['bourse', 'visa', 'admission'].includes(params.get('section')) ? params.get('section') : '';
  const [student, setStudent] = useState(params.get('name') || '');
  const [consultant, setConsultant] = useState('');
  const [date, setDate] = useState('');
  const [path, setPath] = useState('');
  const [privateSchool, setPrivateSchool] = useState(false);
  const [experience, setExperience] = useState([]);
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const [other, setOther] = useState('');
  const heading = useRef(null);
  useEffect(() => { if (section) heading.current?.focus(); }, [section]);
  const navigate = value => { const next = new URLSearchParams(params); if (value) next.set('section', value); else next.delete('section'); setParams(next); };
  const academic = academicPaths.find(item => item.id === path);
  const groups = [
    { title: 'Documents communs à tous les candidats', documents: commonDocuments },
    { title: 'Documents académiques', documents: academic?.documents || [] },
    ...(privateSchool ? [{ title: 'Établissement privé', documents: [{ id: 'equivalence', name: 'Attestation d’équivalence' }] }] : []),
    ...(experience.length ? [{ title: 'Expérience / années de gap', documents: experienceDocuments.filter(item => experience.includes(item.id)) }] : []),
  ];
  const documents = groups.flatMap(group => group.documents);
  const completed = documents.filter(item => checked[item.id]).length;
  const toggle = id => setChecked(previous => ({ ...previous, [id]: !previous[id] }));
  const labels = { bourse: 'Bourse', visa: 'Visa', admission: 'Admission' };
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-text-muted"><Link className="text-navy hover:underline" to={`/prospects?open=${encodeURIComponent(studentId)}`}>Prospect</Link><span>/</span>{section ? <><button className="min-h-11 text-navy hover:underline" onClick={() => navigate('')}>Documents</button><span>/</span><span>{labels[section]}</span></> : <span>Documents</span>}</nav>
    <header><p className="text-xs font-medium uppercase tracking-widest text-text-muted">{student || studentId}</p><h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-semibold text-navy outline-none">{section ? `Documents ${labels[section]}` : 'Documents'}</h1><p className="mt-2 text-sm text-text-muted">{section === 'admission' ? 'Préparez le dossier d’admission à partir de la checklist consultant.' : 'Choisissez une section pour préparer les documents du prospect.'}</p></header>
    <p className="rounded-lg border border-border bg-canvas px-4 py-3 text-sm text-text-muted">Aperçu front uniquement · Les saisies restent dans cette page et sont perdues à son rechargement. Aucune sauvegarde Airtable.</p>
    {!section ? <div className="grid gap-4 sm:grid-cols-3">{Object.entries(labels).map(([key, label], index) => <button key={key} onClick={() => navigate(key)} className={`${card} group min-h-52 text-left transition hover:border-navy hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy`}><span className="inline-flex rounded-lg bg-canvas p-3 text-navy"><FileTextIcon size={24} /></span><span className="mt-5 flex items-center justify-between text-lg font-semibold text-navy">{label}<span aria-hidden="true">→</span></span><span className="mt-2 block text-sm text-text-muted">{['Pièces et justificatifs de bourse.', 'Documents pour la demande de visa.', 'Checklist selon le parcours académique.'][index]}</span><span className="mt-4 block text-xs font-medium text-text-muted">{key === 'admission' ? 'Ouvrir la checklist' : 'Section à préparer'}</span></button>)}</div> : section !== 'admission' ? <section className={`${card} py-12 text-center`}><h2 className="text-lg font-semibold text-navy">{labels[section]}</h2><p className="mx-auto mt-3 max-w-md text-sm text-text-muted">Cette section sera préparée lors d’une prochaine étape. La checklist Admission est disponible dès maintenant.</p><button className={`${button} mt-6`} onClick={() => navigate('admission')}>Ouvrir Admission →</button></section> : <>
      <section className={card}><h2 className="text-lg font-semibold text-navy">01 · Informations du dossier</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><Field label="Nom de l’étudiant"><input className={input} value={student} onChange={event => setStudent(event.target.value)} /></Field><Field label="Consultant"><input className={input} value={consultant} onChange={event => setConsultant(event.target.value)} /></Field><Field label="Date"><input type="date" className={input} value={date} onChange={event => setDate(event.target.value)} /></Field></div></section>
      <section className={card}><h2 className="text-lg font-semibold text-navy">02 · Parcours et conditions particulières</h2><div className="mt-5"><Field label="Parcours académique"><select className={input} value={path} onChange={event => setPath(event.target.value)}><option value="">Choisir le parcours du candidat</option>{academicPaths.map((item, index) => <option key={item.id} value={item.id}>Cas {index + 1} · {item.name}</option>)}</select></Field></div><label className="mt-4 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-navy" checked={privateSchool} onChange={event => setPrivateSchool(event.target.checked)} />Diplôme obtenu dans un établissement privé</label><fieldset className="mt-4"><legend className="text-sm font-medium">Expérience / années de gap</legend><p className="mt-1 text-xs text-text-muted">Sélectionnez les situations correspondant au parcours réel de l’étudiant.</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{experienceDocuments.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-navy" checked={experience.includes(item.id)} onChange={event => setExperience(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.name}</label>)}</div>{experience.includes('other') && <div className="mt-3"><Field label="Autre justificatif — libellé libre"><input className={input} value={other} onChange={event => setOther(event.target.value)} /></Field></div>}</fieldset></section>
      <section className={card}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-navy">03 · Checklist des pièces</h2><span className="rounded-full bg-canvas px-3 py-1 text-sm font-medium text-navy" role="status">{completed} / {documents.length} reçues</span></div><p className="mt-2 text-sm text-text-muted">Cochez les pièces reçues. Les documents urgents sont à demander en priorité.</p><progress aria-label="Documents reçus" className="mt-4 h-2 w-full accent-navy" max={documents.length} value={completed} />{!academic && <p className="mt-4 rounded-lg bg-canvas p-3 text-sm text-text-muted">Choisissez un parcours pour afficher les pièces académiques.</p>}{groups.map(group => <fieldset key={group.title} className="mt-6"><legend className="mb-2 font-medium text-navy">{group.title}</legend><div className="divide-y divide-border">{group.documents.map(item => <label key={item.id} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg px-2 py-3 hover:bg-canvas"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-navy" checked={!!checked[item.id]} onChange={() => toggle(item.id)} /><span className="min-w-0 flex-1 text-sm"><span className={checked[item.id] ? 'text-text-muted' : 'text-text-strong'}>{item.id === 'other' && other ? other : item.name}</span>{item.id === 'passport' && <span className="mt-1 block text-xs text-text-muted">Vérifier la date d’expiration.</span>}</span>{(item.urgent || commonDocuments.some(doc => doc.id === item.id) || item.id === 'equivalence') && <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${item.urgent ? 'bg-amber-50 text-amber-900' : 'bg-canvas text-text-muted'}`}>{item.urgent ? 'Urgent' : 'Moins urgent'}</span>}</label>)}</div></fieldset>)}</section>
      <section className={card}><h2 className="text-lg font-semibold text-navy">04 · Contrôle du dossier par le consultant</h2><div className="mt-4 space-y-1">{consultantChecks.map((label, index) => <label key={label} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 shrink-0 accent-navy" checked={!!checked[`control${index}`]} onChange={() => toggle(`control${index}`)} />{label}</label>)}</div><div className="mt-5"><Field label="Notes du consultant"><textarea className={input} rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Pièces manquantes, exigences universitaires, points à vérifier…" /></Field></div><p className="mt-4 rounded-lg bg-canvas p-4 text-sm text-text-muted">Cette checklist est une base interne de collecte. Les universités peuvent demander des pièces ou formalités supplémentaires.</p></section>
      <button className={button} onClick={() => navigate('')}>← Retour aux documents</button>
    </>}
  </div>;
}
