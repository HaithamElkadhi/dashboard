import { SearchIcon, RefreshIcon, CalendarIcon, WalletIcon, GraduationCapIcon, GlobeIcon, CheckIcon, WhatsAppIcon, FileTextIcon, DownloadIcon, ExternalLinkIcon } from '../components/icons.jsx';
import './RecruitmentPage.css';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { inputClass, buttonClass, primaryClass } from '../components/prospection/controls.jsx';
import { DECISIONS, whatsappUrl, recruitmentToday } from '../lib/recruitment.js';
async function api(body) {
 const response=await fetch('/api/recruitment',{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const result=await response.json();if(!response.ok)throw new Error(result.error || 'Service indisponible.');return result;
}
const fileUrl=(candidate,file,download=false)=>`/api/recruitment?id=${encodeURIComponent(candidate.id)}&fileId=${encodeURIComponent(file.id)}${download?'&download=1':''}`;
const display=value=>Array.isArray(value)?value.join(', '):value===true?'Oui':String(value || '—');
const statusTone = { 'NOT VIEWED':'slate', STUDENT:'blue', INTERVIEW:'amber', ACCEPTED:'green', REJECTED:'red', RECRUITED:'green' };
const dateLabel=value=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}):'Non précisée';
function RecruitmentContact({candidate,onSaved}) {
 const [open,setOpen]=useState(false),[date,setDate]=useState(recruitmentToday),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lines=(candidate.contactHistory || '').split('\n').filter(Boolean);
 const days=candidate.lastContact?Math.floor((Date.parse(recruitmentToday())-Date.parse(candidate.lastContact))/86400000):0;
 const save=async event=>{
  event.preventDefault();setBusy(true);setError('');
  try{const data=await api({action:'add-contact',id:candidate.id,date,reason,expectedHistory:candidate.contactHistory || ''});onSaved(data.candidate);setOpen(false);setReason('');}catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <><button className={`recruit-contact-cell ${days>=14?'is-overdue':days>=7?'is-due':''}`} onClick={()=>{setDate(recruitmentToday());setReason('');setError('');setOpen(true);}}><CalendarIcon size={16}/><span><strong>{candidate.lastContact?dateLabel(candidate.lastContact):'Ajouter un contact'}</strong><small>{candidate.lastContact?(days===0?"Aujourd’hui":`Il y a ${days} jour${days>1?'s':''}`):'Aucun contact enregistré'}</small>{lines[0] && <span className="recruit-contact-reason">{lines[0].replace(/^.*? — /,'')}</span>}</span><span className="recruit-contact-plus">+</span></button>
 {open && <Modal title={`Dernier contact — ${candidate.name}`} subtitle="Chaque contact est ajouté à l’historique du candidat." onClose={()=>{if(!busy)setOpen(false);}} footer={<div className="flex justify-end gap-2"><button className={buttonClass} disabled={busy} onClick={()=>setOpen(false)}>Fermer</button><button type="submit" form={`contact-${candidate.id}`} className={primaryClass} disabled={busy || !reason.trim()}><CheckIcon size={16}/>{busy?'Enregistrement…':'Ajouter le contact'}</button></div>}>
 <form id={`contact-${candidate.id}`} onSubmit={save} className="space-y-4"><label className="block text-sm font-medium">Date du contact<input required type="date" max={recruitmentToday()} value={date} disabled={busy} onChange={e=>setDate(e.target.value)} className={`${inputClass} mt-2`}/></label><label className="block text-sm font-medium">Motif / compte rendu<textarea required rows={3} maxLength={5000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} className={`${inputClass} mt-2`} placeholder="Appel, WhatsApp, entretien…"/></label>{error && <p className="recruit-error" role="alert">{error}</p>}</form>
 <div className="recruit-contact-history"><h3>Historique des contacts <span>{lines.length}</span></h3>{lines.length?<ol>{lines.map((line,index)=><li key={`${index}-${line}`}><span className="recruit-history-dot"/><p>{line}</p></li>)}</ol>:<p className="mt-3 text-sm text-text-muted">Aucun contact enregistré.</p>}</div>
 </Modal>}</>;
}
function CandidateRow({candidate,onSaved,onOpen,onPreview}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[dialog,setDialog]=useState(''),[phone,setPhone]=useState(''),[decision,setDecision]=useState(candidate.decision);
 useEffect(()=>setDecision(candidate.decision),[candidate.decision]);
 const save=async(patch)=>{
  setBusy(true);setError('');setNotice('');
  try { const result=await api({id:candidate.id,...patch,expected:{decision:candidate.decision,phone:candidate.phone}});onSaved(result.candidate);setNotice('Enregistré');return true; }
  catch(e){setDecision(candidate.decision);setError(e.message);return false;}finally{setBusy(false);}
 };
 const openDialog=type=>{setError('');setNotice('');setPhone(candidate.phone);setDialog(type);};
 const initials=candidate.name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('');
 const link=whatsappUrl(phone);
 return <>
 <tr className="recruit-row">
  <td><button className="recruit-person" onClick={()=>onOpen(candidate)}><span className="recruit-avatar">{initials || '?'}</span><span><strong>{candidate.name || 'Sans nom'}</strong><small>{candidate.governorate || 'Localisation non renseignée'}</small></span></button><span className="recruit-received">Reçue le {dateLabel(candidate.received)}</span></td>
  <td><div className="recruit-tags">{candidate.contracts.map(item=><span key={item}>{item}</span>)}<span className="recruit-mode"><GlobeIcon size={12}/>{candidate.mode || 'Mode non précisé'}</span></div><p className="recruit-diploma"><GraduationCapIcon size={15}/>{candidate.diploma || 'Diplôme non renseigné'}</p><div className="recruit-languages">{[['FR',candidate.french],['EN',candidate.english],['IT',candidate.italian]].filter(([,v])=>v && v!=='Aucun').map(([lang,level])=><span key={lang} title={`${lang} : ${level}`}>{lang} <b>{level}</b></span>)}</div></td>
  <td><div className="recruit-fact"><CalendarIcon size={15}/><span><small>Disponible dès</small><strong>{dateLabel(candidate.availability)}</strong></span></div><div className="recruit-fact"><WalletIcon size={15}/><span><small>Salaire souhaité</small><strong>{candidate.salary!==''?`${Number(candidate.salary).toLocaleString('fr-FR')} DT / mois`:'Non renseigné'}</strong></span></div></td>
  <td><RecruitmentContact candidate={candidate} onSaved={onSaved}/></td>
  <td><div className={`recruit-decision tone-${statusTone[decision]}`}><span className="recruit-dot"/><select aria-label={`Décision pour ${candidate.name}`} value={decision} disabled={busy} onChange={e=>{setDecision(e.target.value);save({decision:e.target.value});}}>{DECISIONS.map(s=><option key={s}>{s}</option>)}</select></div><p className="recruit-feedback" role="status">{busy?'Enregistrement…':notice}</p>{error && !dialog && <p className="recruit-error" role="alert">{error}</p>}</td>
  <td><div className="recruit-actions"><button className="recruit-whatsapp recruit-icon-button" aria-label={`WhatsApp — ${candidate.name}`} title="Vérifier le numéro et ouvrir WhatsApp" onClick={()=>openDialog('phone')}><WhatsAppIcon size={18}/></button>{candidate.cv.length?candidate.cv.map(file=><button className="recruit-cv recruit-icon-button" aria-label={`Aperçu CV — ${candidate.name} — ${file.filename}`} title={`Aperçu : ${file.filename}`} key={file.id} onClick={()=>onPreview({candidate,file})}><FileTextIcon size={18}/></button>):<span className="recruit-received">CV non fourni</span>}</div></td>
 </tr>
 {dialog==='phone' && <Modal title="Contacter sur WhatsApp" subtitle={candidate.name} onClose={()=>{if(!busy)setDialog('');}} footer={<div className="flex flex-wrap justify-end gap-2"><button disabled={busy} className={buttonClass} onClick={()=>setDialog('')}>Fermer</button>{phone!==candidate.phone && <button disabled={busy || !link} className={buttonClass} onClick={()=>save({phone})}><CheckIcon size={16}/>{busy?'Enregistrement…':'Enregistrer le numéro'}</button>}{link?<a className="recruit-whatsapp" href={link} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18}/>Ouvrir la conversation<ExternalLinkIcon size={14}/></a>:<button disabled className={buttonClass}>Numéro invalide</button>}</div>}><div className="recruit-contact-banner"><WhatsAppIcon size={24}/><p>Vérifiez le numéro avant d’ouvrir la conversation.<small>Vous pouvez le corriger ici et l’enregistrer dans la candidature.</small></p></div><label className="mt-5 block text-sm font-medium" htmlFor="recruit-phone">Numéro WhatsApp</label><input autoFocus id="recruit-phone" type="tel" className={`${inputClass} mt-2`} value={phone} disabled={busy} onChange={e=>setPhone(e.target.value)} placeholder="+216 50 123 456"/><p className="mt-2 text-xs text-text-muted">Indicatif pays inclus. Les numéros tunisiens à 8 chiffres utilisent +216.</p>{link && <p className="mt-4 text-sm">Conversation avec <strong>+{link.split('/').pop()}</strong></p>}{phone!==candidate.phone && <p className="mt-2 text-xs text-text-muted">La correction reste temporaire tant que vous ne l’enregistrez pas.</p>}{error && <p role="alert" className="recruit-error">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-emerald-700">Numéro enregistré.</p>}</Modal>}
 </>;
}
export default function RecruitmentPage() {
 const {user}=useAuth();const allowed=user?.isAdmin;
 const [candidates,setCandidates]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[mode,setMode]=useState(''),[contract,setContract]=useState(''),[selected,setSelected]=useState(null),[preview,setPreview]=useState(null),[blob,setBlob]=useState(''),[fileError,setFileError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{setCandidates((await api()).candidates);}catch(e){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{if(allowed)load();},[allowed]);
 useEffect(()=>{
  setBlob('');setFileError('');if(!preview)return;
  const controller=new AbortController();let objectUrl;
  fetch(fileUrl(preview.candidate,preview.file),{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('Impossible de charger le CV.');const content=await response.blob();if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(content);setBlob(objectUrl);}).catch(e=>{if(e.name!=='AbortError')setFileError(e.message);});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[preview]);
 if(!allowed)return <div className="p-6" role="alert">Accès réservé aux administrateurs.</div>;
 const normalized=query.trim().toLocaleLowerCase();
 const filtered=candidates.filter(c=>(!status || c.decision===status)&&(!mode || c.mode===mode)&&(!contract || c.contracts.includes(contract))&&[c.name,c.phone,c.governorate,c.diploma,c.note].join(' ').toLocaleLowerCase().includes(normalized));
 const onSaved=c=>setCandidates(old=>old.map(item=>item.id===c.id?c:item));
 return <div className="recruitment mx-auto max-w-screen-2xl space-y-6 p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="recruit-eyebrow">HUMAN RESSOURCES <span>/</span> RECRUITMENT</p><p className="mt-2 text-sm text-text-muted">Examinez les profils, échangez avec les candidats et suivez vos décisions.</p></div><button className={buttonClass} disabled={loading} onClick={load}><RefreshIcon size={16}/>Actualiser</button></div>
  <div className="overflow-x-auto" aria-label="Décisions de candidature"><div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-border bg-surface p-1">{[{id:'',label:'Tous'},...DECISIONS.map(id=>({id,label:id}))].map(tab=>{const active=status===tab.id;return <button key={tab.id} type="button" aria-pressed={active} onClick={()=>setStatus(tab.id)} className={`recruit-status-tab ${tab.id?`tone-${statusTone[tab.id]}`:''} inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${active?'is-active shadow-sm':'text-text-muted hover:text-text-strong'}`}>{tab.label}<span className={`rounded-full px-1.5 text-xs tabular-nums ${active?'bg-black/10':'bg-canvas text-text-muted'}`}>{tab.id?candidates.filter(c=>c.decision===tab.id).length:candidates.length}</span></button>;})}</div></div>
  <div className="recruit-toolbar"><div className="recruit-search"><SearchIcon size={18}/><input aria-label="Rechercher une candidature" className={`${inputClass} max-w-sm`} placeholder="Nom, WhatsApp, gouvernorat, note…" value={query} onChange={e=>setQuery(e.target.value)} /></div><select aria-label="Mode de travail" className={`${inputClass} max-w-48`} value={mode} onChange={e=>setMode(e.target.value)}><option value="">Tous les modes</option>{['Présentiel','À distance','Les deux'].map(s=><option key={s}>{s}</option>)}</select><select aria-label="Type de contrat" className={`${inputClass} max-w-48`} value={contract} onChange={e=>setContract(e.target.value)}><option value="">Tous les contrats</option>{['CDI','CDD','Freelance','Temps partiel','Stage'].map(s=><option key={s}>{s}</option>)}</select></div>
  {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
  <div className="recruit-list-heading"><h2>Candidatures <span>{filtered.length}</span></h2><p>Les décisions sont enregistrées automatiquement.</p></div>
  {loading?<p role="status">Chargement des candidatures…</p>:<div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="recruit-table w-full text-left text-sm"><thead className="bg-canvas"><tr>{['Candidat','Profil','Disponibilité & salaire','Dernier contact','Décision','Contact & CV'].map(t=><th scope="col" key={t} className="p-4 font-medium">{t}</th>)}</tr></thead><tbody>{filtered.map(c=><CandidateRow key={c.id} candidate={c} onSaved={onSaved} onOpen={setSelected} onPreview={setPreview} />)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-text-muted">{candidates.length?'Aucune candidature ne correspond aux filtres.':'Aucune candidature disponible.'}</p>}</div>}
  {selected && <Modal title={selected.name} size="lg" onClose={()=>setSelected(null)}><dl className="grid gap-4 sm:grid-cols-2">{[['WhatsApp','phone'],['Gouvernorat','governorate'],['Ville / adresse','address'],['Date de naissance','birthDate'],['Contrats','contracts'],['Mode de travail','mode'],['Disponibilité','availability'],['Salaire attendu (DT)','salary'],['Diplôme','diploma'],['Arabe','arabic'],['Français','french'],['Anglais','english'],['Italien','italian'],['Expérience professionnelle','experience'],['Consentement recrutement','consent']].map(([label,key])=><div key={key}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{display(selected[key])}</dd></div>)}</dl></Modal>}
  {preview && <Modal title={`CV · ${preview.candidate.name}`} subtitle={preview.file.filename} size="xl" onClose={()=>setPreview(null)} footer={<a className={primaryClass} href={fileUrl(preview.candidate,preview.file,true)}>Télécharger le CV</a>}>
   {fileError?<p role="alert">{fileError}</p>:!blob?<p role="status">Chargement du CV…</p>:/\.pdf$/i.test(preview.file.filename)?<iframe title="Aperçu du CV" src={blob} className="h-[65vh] w-full rounded-lg border border-border" />:<p>Aperçu indisponible pour ce format. Utilisez « Télécharger le CV » pour le consulter.</p>}
  </Modal>}
 </div>;
}
