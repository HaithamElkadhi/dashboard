import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { EDUCATION_UI, EDUCATION_TABS, educationLabel, educationText, educationToday, educationEmailTemplate } from '../lib/educationUi.js';
import { EDUCATION_ENTITIES } from '../lib/education.js';
import AttendanceCalendar from './education/AttendanceCalendar.jsx';
import './education.css';

export async function educationApi(body, signal) {
  const response = await fetch('/api/education', { credentials: 'same-origin', cache: 'no-store', signal, ...(body ? { method: body.id && !body.action ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Impossible de charger Education.');
  return result;
}
const safeUrl = url => /^https:\/\//i.test(url || '');
function StudentPhoto({ student, small = false }) {
  const photo = student?.fields.Photo?.[0];
  return photo && safeUrl(photo.url) ? <img className={`edu-photo ${small ? 'small' : ''}`} src={photo.thumbnails?.large?.url || photo.url} alt={`Photo de ${educationLabel('students', student)}`} /> : <span className={`edu-photo edu-photo-placeholder ${small ? 'small' : ''}`} aria-hidden="true">{educationLabel('students', student).slice(0, 1).toUpperCase()}</span>;
}
function FileLinks({ files }) { return <div>{(files || []).map((file, index) => safeUrl(file.url) && <a key={file.id || index} className="edu-file" href={file.url} target="_blank" rel="noreferrer">{file.filename || `Copie ${index + 1}`} ↗</a>)}</div>; }
function readFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Impossible de lire le fichier.')); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file); }); }

function RecordEditor({ entity, record, studentId, tables, onSave, onDone, onClose }) {
  const config = EDUCATION_UI[entity], savedRecord = useRef(record);
  const gradeMax = record?.fields['Barème'] || 20;
  const required = name => EDUCATION_ENTITIES[entity].required.includes(name);
  const [form, setForm] = useState(() => Object.fromEntries(config.fields.map(field => [field.name, record?.fields[field.name] ?? (field.type === 'link' ? (field.name === 'Élève' && studentId ? [studentId] : []) : field.type === 'attachments' ? [] : field.type === 'date' ? educationToday() : field.name === 'Catégorie' ? 'Observation' : '')])));
  const [files, setFiles] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [parentDraft, setParentDraft] = useState(null), [parentBusy, setParentBusy] = useState(false);
  const baseline = useRef(JSON.stringify(form)), dirty = JSON.stringify(form) !== baseline.current || Object.values(files).some(list => list.length) || !!parentDraft;
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const change = (name, value) => setForm(old => ({ ...old, [name]: value }));
  const close = () => { if (!busy && !parentBusy && (!dirty || window.confirm('Abandonner les modifications non enregistrées ?'))) onClose(); };
  const pickFiles = (field, chosen) => {
    setError(''); const selected = Array.from(chosen || []), photo = field === 'Photo';
    if (selected.some(file => file.size > 3 * 1024 * 1024 || !(photo ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']).includes(file.type))) { setError('Choisissez des PDF ou images JPG/PNG/WebP de 3 Mo maximum par fichier (photo : image uniquement).'); return; }
    if (selected.length + (form[field]?.length || 0) > (photo ? 1 : 10)) { setError(photo ? 'Retirez la photo actuelle avant de choisir la nouvelle.' : 'Maximum 10 copies.'); return; }
    setFiles(old => ({ ...old, [field]: selected }));
  };
  const addParent = async () => {
    if (parentBusy || !parentDraft?.name.trim() || !parentDraft?.email.trim()) return;
    setParentBusy(true); setError('');
    try { const saved = await onSave({ entity: 'parents', fields: { 'Nom complet': parentDraft.name, Email: parentDraft.email, Téléphone: parentDraft.phone } }); change('Parents', [...(form.Parents || []), saved.id]); setParentDraft(null); }
    catch (err) { setError(err.message); } finally { setParentBusy(false); }
  };
  const submit = async event => {
    event.preventDefault(); if (busy || parentBusy) return;
    if (parentDraft) { setError('Ajoutez ou annulez le nouveau parent avant d’enregistrer l’élève.'); return; }
    setBusy(true); setError('');
    try {
      const fields = Object.fromEntries(config.fields.map(field => [field.name, field.type === 'number' ? (form[field.name] === '' ? null : Number(form[field.name])) : ['date', 'select'].includes(field.type) ? form[field.name] || null : form[field.name]]));
      if (entity === 'results' && !fields.Examen) fields.Examen = `Note du ${fields.Date}`;
      if (entity === 'events' && !fields.Objet) fields.Objet = `${fields.Catégorie} du ${fields.Date}`;
      let saved = await onSave({ entity, fields, ...(savedRecord.current ? { id: savedRecord.current.id, expected: savedRecord.current.fields } : {}) });
      savedRecord.current = saved;
      for (const [field, pending] of Object.entries(files)) {
        for (const file of pending) {
          const response = await educationApi({ action: 'upload', entity, id: saved.id, field, file: { filename: file.name, contentType: file.type, content: await readFile(file) } });
          saved = response.record; savedRecord.current = saved;
          change(field, saved.fields[field] || []);
          setFiles(old => ({ ...old, [field]: (old[field] || []).filter(item => item !== file) }));
          await onSave(null, { entity, record: saved });
        }
      }
      onDone(saved);
    } catch (err) { setError(`${err.message}${savedRecord.current ? ' Les informations ont été enregistrées. Un import non confirmé doit être vérifié en actualisant le dossier avant de le renvoyer.' : ''}`); }
    finally { setBusy(false); }
  };
  return <section className="edu-card"><div className="edu-section-heading"><h2>{record ? 'Modifier' : 'Ajouter'} {config.singular}</h2><button className="edu-button" disabled={busy || parentBusy} onClick={close}>Annuler</button></div>
    <form onSubmit={submit}><fieldset disabled={busy || parentBusy} className="edu-form">
      {config.fields.filter(field => field.type !== 'hidden' && !(studentId && field.name === 'Élève')).map((field, index) => {
        const title = field.label || field.name, aria = `${title}${required(field.name) ? ' *' : ''}`;
        return <div key={field.name} className={['textarea', 'attachments'].includes(field.type) ? 'edu-wide' : ''}><label><span>{aria}{field.name === 'Note' ? ` / ${gradeMax}` : ''}</span>
          {field.type === 'textarea' ? <textarea aria-label={aria} required={required(field.name)} rows={4} maxLength={20000} value={form[field.name]} onChange={e => change(field.name, e.target.value)} />
            : field.type === 'link' ? <select aria-label={aria} required={required(field.name)} multiple={field.multiple} value={field.multiple ? form[field.name] : form[field.name]?.[0] || ''} onChange={e => change(field.name, field.multiple ? Array.from(e.target.selectedOptions, option => option.value) : e.target.value ? [e.target.value] : [])}><option value="" disabled={field.multiple}>Choisir…</option>{(tables[field.target] || []).map(item => <option key={item.id} value={item.id}>{educationLabel(field.target, item)}</option>)}</select>
              : field.type === 'select' ? <select aria-label={aria} required={required(field.name)} value={form[field.name]} onChange={e => change(field.name, e.target.value)}>{field.choices.map(name => <option key={name}>{name}</option>)}</select>
                : field.type === 'attachments' ? <input aria-label={aria} type="file" accept={field.name === 'Photo' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png,image/webp'} multiple={field.name !== 'Photo'} onChange={e => pickFiles(field.name, e.target.files)} />
                  : <input ref={index === 0 ? input : undefined} aria-label={aria} required={required(field.name)} type={field.type} min={field.type === 'number' ? 0 : undefined} max={field.type === 'number' ? gradeMax : undefined} step={field.type === 'number' ? '0.01' : undefined} maxLength={500} value={form[field.name]} onChange={e => change(field.name, e.target.value)} />}
        </label>
          {field.type === 'attachments' && <><small>{field.name === 'Photo' ? 'Photo JPG, PNG ou WebP.' : 'Copies PDF, JPG, PNG ou WebP.'} 3 Mo maximum par fichier.</small>{(form[field.name] || []).map((file, i) => <div className="edu-pending-file" key={file.id || i}><span>{file.filename || 'Fichier enregistré'}</span><button type="button" className="edu-link" onClick={() => change(field.name, form[field.name].filter((_, index) => index !== i))}>Retirer</button></div>)}{(files[field.name] || []).map((file, i) => <div className="edu-pending-file" key={i}><span>{file.name} · à importer</span><button type="button" className="edu-link" onClick={() => setFiles(old => ({ ...old, [field.name]: old[field.name].filter((_, index) => index !== i) }))}>Retirer</button></div>)}</>}
          {field.name === 'Parents' && <><small>Sélectionnez un ou plusieurs parents (Ctrl / Cmd).</small><button type="button" className="edu-link" onClick={() => setParentDraft({ name: '', email: '', phone: '' })}>+ Ajouter un parent</button></>}
        </div>;
      })}
    </fieldset>
      {parentDraft && <div className="edu-inline-parent"><h3>Nouveau parent</h3><div className="edu-form"><label><span>Nom du parent</span><input value={parentDraft.name} disabled={parentBusy} onChange={e => setParentDraft(old => ({ ...old, name: e.target.value }))} /></label><label><span>Email du parent</span><input type="email" value={parentDraft.email} disabled={parentBusy} onChange={e => setParentDraft(old => ({ ...old, email: e.target.value }))} /></label><label><span>Téléphone du parent</span><input type="tel" value={parentDraft.phone} disabled={parentBusy} onChange={e => setParentDraft(old => ({ ...old, phone: e.target.value }))} /></label></div><button className="edu-button" type="button" disabled={parentBusy || !parentDraft.name.trim() || !parentDraft.email.trim()} onClick={addParent}>{parentBusy ? 'Ajout…' : 'Ajouter ce parent'}</button><button className="edu-link" type="button" disabled={parentBusy} onClick={() => setParentDraft(null)}>Annuler le parent</button></div>}
      <p className="edu-muted">* Champ obligatoire</p>{error && <p role="alert" className="edu-error">{error}</p>}<div className="edu-actions"><button disabled={busy || parentBusy} className="edu-button edu-primary" type="submit">{busy ? 'Enregistrement et import…' : 'Enregistrer'}</button></div>
    </form></section>;
}

function EmailComposer({ student, parents, source, onClose }) {
  const initialKind = source?.entity === 'results' ? 'note' : source ? 'observation' : 'libre';
  const [kind, setKind] = useState(initialKind), [parentId, setParentId] = useState(parents.find(parent => parent.fields.Email)?.id || '');
  const [cc, setCc] = useState('');
  const [message, setMessage] = useState(() => educationEmailTemplate(initialKind, student, source?.record));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const requestId = useRef(crypto.randomUUID()), baseline = useRef(JSON.stringify(message));
  const dirty = JSON.stringify(message) !== baseline.current || !!cc.trim();
  useEffect(() => { const warn = e => { if (!sent && dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, sent]);
  const change = (key, value) => { setMessage(old => ({ ...old, [key]: value })); requestId.current = crypto.randomUUID(); };
  const choose = value => { if (dirty && !window.confirm('Remplacer le contenu saisi par ce modèle ?')) return; setKind(value); const next = educationEmailTemplate(value, student, source?.record); setMessage(next); baseline.current = JSON.stringify(next); requestId.current = crypto.randomUUID(); };
  const close = () => { if (!busy && (sent || !dirty || window.confirm('Abandonner cet email non envoyé ?'))) onClose(); };
  const send = async event => {
    event.preventDefault(); if (busy || sent) return; setBusy(true); setError('');
    try { await educationApi({ action: 'email', studentId: student.id, parentId, cc: cc.trim(), subject: message.subject, body: message.body, requestId: requestId.current, ...(source ? { source: { entity: source.entity, id: source.record.id } } : {}) }); setSent(true); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section className="edu-card"><div className="edu-section-heading"><h2>Envoyer un email au parent</h2><button disabled={busy} className="edu-button" onClick={close}>Fermer</button></div>{sent ? <p className="edu-success" role="status">Email envoyé au parent.</p> : <form onSubmit={send}><fieldset disabled={busy} className="edu-form"><label><span>Parent destinataire</span><select required aria-label="Parent destinataire" value={parentId} onChange={e => { setParentId(e.target.value); requestId.current = crypto.randomUUID(); }}><option value="">Choisir un parent</option>{parents.map(parent => <option key={parent.id} value={parent.id} disabled={!parent.fields.Email}>{educationLabel('parents', parent)} · {parent.fields.Email || 'Email manquant'}</option>)}</select></label><label><span>Copie (CC) — facultatif</span><input type="email" aria-label="Copie (CC)" maxLength={254} placeholder="directeur@exemple.com" value={cc} onChange={e => { setCc(e.target.value); requestId.current = crypto.randomUUID(); }} /><small>Le destinataire en copie reçoit aussi les pièces jointes.</small></label><label><span>Modèle</span><select aria-label="Modèle" value={kind} onChange={e => choose(e.target.value)}><option value="libre">Texte libre</option><option value="note">Note scolaire</option><option value="observation">Observation / discipline</option></select></label><label className="edu-wide"><span>Objet</span><input aria-label="Objet de l’email" required maxLength={200} value={message.subject} onChange={e => change('subject', e.target.value)} /></label><label className="edu-wide"><span>Contenu du message</span><textarea aria-label="Contenu du message" rows={12} required maxLength={20000} value={message.body} onChange={e => change('body', e.target.value)} /></label></fieldset>{source?.entity === 'results' && !!source.record.fields['Copies d’examen']?.length && <div className="edu-muted"><p>Pièces jointes envoyées au parent avec cet email :</p><ul>{source.record.fields["Copies d’examen"].map((file, index) => <li key={file.id || index}>{file.filename || `Copie ${index + 1}`}</li>)}</ul></div>}{!parents.some(parent => parent.fields.Email) && <p className="edu-error">Ajoutez un parent avec une adresse email dans la fiche élève.</p>}{error && <p className="edu-error" role="alert">{error}</p>}<div className="edu-actions"><button className="edu-button edu-primary" disabled={busy || !parentId} type="submit">{busy ? 'Envoi…' : 'Envoyer au parent'}</button></div></form>}</section>;
}

function EducationWorkspace() {
  const [params, setParams] = useSearchParams();
  const tab = Object.hasOwn(EDUCATION_TABS, params.get('tab')) ? params.get('tab') : 'students';
  const [tables, setTables] = useState({}), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null), [email, setEmail] = useState(null), [search, setSearch] = useState(''), [classFilter, setClassFilter] = useState('');
  const [attendanceDirty, setAttendanceDirty] = useState(false), [attendanceBusy, setAttendanceBusy] = useState(false), [lastUpdated, setLastUpdated] = useState(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const result = await educationApi(); if (current === generation.current) { setTables(result.tables); setLastUpdated(new Date()); } }
    catch (err) { if (current === generation.current) setError(err.message); } finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { generation.current++; }; }, [load]);
  usePageRefreshRegistration({ lastUpdated, refresh: editor || email || attendanceDirty ? null : load, loading });
  const selected = tables.students?.find(item => item.id === params.get('student'));
  const navigate = next => { if (attendanceBusy || attendanceDirty && !window.confirm('Abandonner cet appel non enregistré ?')) return; setAttendanceDirty(false); setEditor(null); setEmail(null); setSearch(''); setParams(next); };
  const merge = (entity, record) => setTables(old => ({ ...old, [entity]: [...(old[entity] || []).filter(item => item.id !== record.id), record] }));
  const save = async (body, uploaded) => {
    generation.current++; setLoading(false);
    if (uploaded) { merge(uploaded.entity, uploaded.record); return uploaded.record; }
    const result = await educationApi(body); generation.current++; merge(body.entity, result.record); setLastUpdated(new Date()); return result.record;
  };
  const saveAttendance = async body => { generation.current++; setLoading(false); const result = await educationApi(body); generation.current++; setTables(old => ({ ...old, attendance: [...(old.attendance || []).filter(item => !result.records.some(saved => saved.id === item.id)), ...result.records] })); setLastUpdated(new Date()); return result; };
  const openEditor = (entity, record) => { setNotice(''); setEditor({ entity, record }); };
  const startEmail = source => { setNotice(''); setEmail({ source }); };
  const parents = (selected?.fields.Parents || []).map(id => tables.parents?.find(item => item.id === id)).filter(Boolean);
  const studentRecords = key => (tables[key] || []).filter(item => item.fields['Élève']?.includes(selected?.id)).sort((a, b) => (b.fields.Date || '').localeCompare(a.fields.Date || ''));
  return <div className="education"><header className="edu-heading"><div><span className="edu-eyebrow">ESPACE ADMINISTRATEUR</span><h1>Education</h1><p>Les élèves, leurs notes et le lien avec leurs parents.</p></div><button className="edu-button" onClick={load} disabled={loading || !!editor || !!email || attendanceDirty}>{loading ? 'Chargement…' : 'Actualiser'}</button></header>
    {error && <p role="alert" className="edu-error">{error} <button disabled={!!editor || !!email || attendanceDirty} onClick={load}>Réessayer</button></p>}{notice && <p role="status" className="edu-success">{notice}</p>}
    {!editor && !email && <nav className="edu-tabs" aria-label="Sections Education">{Object.entries(EDUCATION_TABS).map(([key, label]) => <button key={key} disabled={attendanceBusy} className={tab === key ? 'is-active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => navigate({ tab: key })}>{label}</button>)}</nav>}
    {editor ? <RecordEditor key={`${editor.entity}:${editor.record?.id || 'new'}`} {...editor} studentId={selected?.id} tables={tables} onSave={save} onDone={saved => { setEditor(null); setNotice('Enregistrement confirmé.'); if (editor.entity === 'students') setParams({ tab: 'students', student: saved.id }); }} onClose={() => setEditor(null)} />
      : email && selected ? <EmailComposer student={selected} parents={parents} source={email.source} onClose={() => setEmail(null)} />
        : loading && !Object.keys(tables).length ? <div className="edu-card edu-empty" role="status">Chargement…</div>
          : tab === 'attendance' ? <AttendanceCalendar tables={tables} onSave={saveAttendance} onReload={load} onDirtyChange={setAttendanceDirty} onBusyChange={setAttendanceBusy} onOpenStudent={id => { setAttendanceDirty(false); setParams({ tab: 'students', student: id }); }} />
            : selected ? <>
              <section className="edu-card"><button className="edu-link" onClick={() => navigate({ tab: 'students' })}>← Tous les élèves</button><div className="edu-section-heading"><div className="edu-student-heading"><StudentPhoto student={selected} /><div><h2>{educationLabel('students', selected)}</h2><p>{educationText('students', 'Classe', selected.fields.Classe, tables)}</p></div></div><div className="edu-button-group"><button className="edu-button" onClick={() => openEditor('students', selected)}>Modifier l’élève</button><button className="edu-button edu-primary" onClick={() => startEmail(null)}>Envoyer un email</button></div></div>
                <h3>Parents</h3>{parents.map(parent => <div key={parent.id} className="edu-parent"><div><strong>{educationLabel('parents', parent)}</strong><p>{parent.fields.Email || 'Email à renseigner'} · {parent.fields.Téléphone || 'Téléphone à renseigner'}</p></div><button className="edu-link" onClick={() => openEditor('parents', parent)}>Modifier</button></div>)}{!parents.length && <p className="edu-muted">Modifiez l’élève pour lui associer un parent.</p>}
              </section>
              <section className="edu-card"><div className="edu-section-heading"><h2>Notes et copies</h2><button className="edu-button edu-primary" onClick={() => openEditor('results')}>+ Ajouter une note</button></div>{!studentRecords('results').length && <p className="edu-muted">Aucune note pour le moment.</p>}{studentRecords('results').map(item => <article className="edu-entry" key={item.id}><div className="edu-section-heading"><div><strong className="edu-grade">{item.fields.Note ?? '—'} <small>/ {item.fields['Barème'] || 20}</small></strong><p className="edu-muted">{item.fields.Date}</p></div><div className="edu-button-group"><button className="edu-button" onClick={() => openEditor('results', item)}>Modifier</button><button className="edu-button" onClick={() => startEmail({ entity: 'results', record: item })}>Envoyer au parent</button></div></div>{item.fields.Commentaire && <p className="edu-observation">{item.fields.Commentaire}</p>}<FileLinks files={item.fields['Copies d’examen']} /></article>)}</section>
              <section className="edu-card"><div className="edu-section-heading"><h2>Observations et discipline</h2><button className="edu-button edu-primary" onClick={() => openEditor('events')}>+ Ajouter une observation</button></div>{!studentRecords('events').length && <p className="edu-muted">Aucune observation pour le moment.</p>}{studentRecords('events').map(item => <article className="edu-entry" key={item.id}><div className="edu-section-heading"><div><span className="edu-badge">{item.fields.Catégorie || item.fields.Type || 'Observation'}</span><p className="edu-muted">{item.fields.Date}{item.fields.Auteur ? ` · ${item.fields.Auteur}` : ''}</p></div><div className="edu-button-group"><button className="edu-button" onClick={() => openEditor('events', item)}>Modifier</button><button className="edu-button" onClick={() => startEmail({ entity: 'events', record: item })}>Envoyer au parent</button></div></div><p className="edu-observation">{item.fields.Observation}</p></article>)}</section>
              {!!(tables.attendance || []).filter(item => item.fields['Élève']?.includes(selected.id) && item.fields.Présence !== 'Présent').length && <section className="edu-card"><h2>Absences et retards</h2>{(tables.attendance || []).filter(item => item.fields['Élève']?.includes(selected.id) && item.fields.Présence !== 'Présent').sort((a, b) => (b.fields.Date || '').localeCompare(a.fields.Date || '')).map(item => <div className="edu-parent" key={item.id}><span>{item.fields.Date}</span><span className="edu-badge">{item.fields.Présence}</span></div>)}</section>}
            </>
              : tab === 'classes' ? <section className="edu-card"><div className="edu-section-heading"><h2>Classes</h2><button className="edu-button edu-primary" onClick={() => openEditor('classes')}>+ Ajouter une classe</button></div>{!(tables.classes || []).length && <p className="edu-muted">Ajoutez une classe pour commencer.</p>}{(tables.classes || []).map(item => <div className="edu-parent" key={item.id}><div><strong>{educationLabel('classes', item)}</strong><p className="edu-muted">{[item.fields.Niveau, item.fields['Année scolaire']].filter(Boolean).join(' · ')}</p></div><button className="edu-link" onClick={() => openEditor('classes', item)}>Modifier</button></div>)}</section>
                : <><div className="edu-filters"><label><span>Rechercher un élève</span><input type="search" value={search} placeholder="Nom de l’élève…" onChange={e => setSearch(e.target.value)} /></label><label><span>Classe</span><select aria-label="Filtrer par classe" value={classFilter} onChange={e => setClassFilter(e.target.value)}><option value="">Toutes les classes</option>{(tables.classes || []).map(item => <option key={item.id} value={item.id}>{educationLabel('classes', item)}</option>)}</select></label></div><section className="edu-card"><div className="edu-section-heading"><div><h2>Élèves</h2><p className="edu-muted">{tables.students?.length || 0} élève(s)</p></div><button className="edu-button edu-primary" onClick={() => openEditor('students')}>+ Ajouter un élève</button></div><div className="edu-student-list">{(tables.students || []).filter(item => educationLabel('students', item).toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!classFilter || item.fields.Classe?.includes(classFilter))).sort((a, b) => educationLabel('students', a).localeCompare(educationLabel('students', b), 'fr')).map(item => <button className="edu-student-row" key={item.id} onClick={() => setParams({ tab: 'students', student: item.id })}><StudentPhoto student={item} small /><span><strong>{educationLabel('students', item)}</strong><small>{educationText('students', 'Classe', item.fields.Classe, tables)}</small></span><span className="edu-muted">Ouvrir →</span></button>)}</div>{!(tables.students || []).length && <p className="edu-empty">Ajoutez une classe, puis votre premier élève et son parent.</p>}</section></>}
  </div>;
}
export default function EducationPage() { const { user } = useAuth(); return user?.isAdmin ? <EducationWorkspace /> : <Navigate to="/" replace />; }
