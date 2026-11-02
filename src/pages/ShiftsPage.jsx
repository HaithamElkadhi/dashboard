import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, SettingsIcon, RefreshIcon, CopyIcon, PencilIcon, XIcon, CheckIcon, ClockIcon, DownloadIcon } from '../components/icons.jsx';
import { localDateTimeToIso, zonedParts, dateAdd } from '../lib/shifts.js';
import './ShiftsPage.css';
import { reportRanges, buildShiftReport } from '../lib/shiftReport.js';

const ZONES = ['Africa/Tunis', 'Europe/Rome'];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MODES = ['Présentiel', 'À distance'];
const emptyData = { users: [], shifts: [], rules: [], absences: [] };
const todayIn = zone => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const monday = date => dateAdd(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
const prettyDate = (date, options = {}) => new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...options });
const localInput = (iso, zone) => { const value = zonedParts(iso, zone); return `${value.date}T${value.time}`; };
const timeLabel = (iso, zone) => zonedParts(iso, zone).time;
const activeRecord = record => !['Annulé', 'Cancelled', 'cancelled'].includes(record.status);
const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('');
async function api(body, start, end, signal) {
  const response = await fetch(`/api/shifts${body ? '' : `?start=${start}&end=${end}`}`, {
    cache: 'no-store', signal,
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Planning indisponible. Réessayez.');
  return result;
}
function IconButton({ label, children, className = '', ...props }) {
  return <button type="button" className={`shift-icon-button ${className}`} title={label} aria-label={label} {...props}>{children}</button>;
}
function Field({ label, children, wide = false }) {
  return <label className={`shift-field ${wide ? 'shift-field-wide' : ''}`}><span>{label}</span>{children}</label>;
}

function ShiftEditor({ modal, users, zone, onClose, onSubmit, onCancel, busy, error }) {
  const { kind, record, date, userId } = modal;
  const isRule = kind === 'rule';
  const isAbsence = kind === 'absence';
  const initiallyAllDay = isAbsence && record?.start && record?.end && zonedParts(record.start, zone).time === '00:00' && zonedParts(record.end, zone).time === '00:00';
  const [values, setValues] = useState(() => ({
    userId: record?.userId || userId || users.find(user => user.isActive)?.id || '',
    start: record?.start ? localInput(record.start, zone) : `${date}T09:00`,
    end: record?.end ? (initiallyAllDay ? `${dateAdd(zonedParts(record.end, zone).date, -1)}T00:00` : localInput(record.end, zone)) : `${date}T17:00`,
    breakMinutes: record?.breakMinutes ?? 60, mode: record?.mode || 'Présentiel', note: record?.note || '',
    weekdays: record?.weekdays || [1, 2, 3, 4, 5], startTime: record?.startTime || '09:00', endTime: record?.endTime || '17:00',
    timeZone: record?.timeZone || zone, validFrom: record?.validFrom || date, validTo: record?.validTo || '',
    active: record?.active ?? true, type: record?.type || 'Congé',
  }));
  const [validation, setValidation] = useState('');
  const [allDay, setAllDay] = useState(!!initiallyAllDay);
  const set = (key, value) => setValues(old => ({ ...old, [key]: value }));
  const submit = event => {
    event.preventDefault(); setValidation('');
    try {
      let input;
      if (isRule) {
        if (!values.weekdays.length) throw new Error('Sélectionnez au moins un jour de travail.');
        input = { userId: values.userId, weekdays: values.weekdays, startTime: values.startTime, endTime: values.endTime, breakMinutes: Number(values.breakMinutes), mode: values.mode, timeZone: values.timeZone, validFrom: values.validFrom, validTo: values.validTo, active: values.active };
      } else {
        const [startDate, startTime] = values.start.split('T'), [endDate, endTime] = values.end.split('T');
        const start = localDateTimeToIso(startDate, isAbsence && allDay ? '00:00' : startTime, zone), end = localDateTimeToIso(isAbsence && allDay ? dateAdd(endDate, 1) : endDate, isAbsence && allDay ? '00:00' : endTime, zone);
        if (Date.parse(end) <= Date.parse(start)) throw new Error('La fin doit être après le début. Pour un shift de nuit, choisissez le lendemain.');
        input = isAbsence ? { userId: values.userId, start, end, type: values.type, note: values.note }
          : { userId: values.userId, start, end, breakMinutes: Number(values.breakMinutes), mode: values.mode, note: values.note };
      }
      onSubmit({ action: `save-${kind}`, ...(record ? { id: record.id, expected: record.revision } : {}), input });
    } catch (err) { setValidation(err.message); }
  };
  return <Modal title={`${record ? 'Modifier' : 'Ajouter'} ${isRule ? 'un horaire récurrent' : isAbsence ? 'une absence' : 'un shift'}`} subtitle={isRule ? 'Les horaires deviennent des shifts lorsque vous générez une période.' : `Heures affichées : ${zone === 'Africa/Tunis' ? 'Tunisie' : 'Italie'}`} onClose={onClose} size="lg"
    footer={<div className="shift-modal-actions">{record && !isRule && <button type="button" className="shift-button shift-danger" disabled={busy} onClick={onCancel}><XIcon size={15}/>{isAbsence ? 'Annuler l’absence' : 'Annuler le shift'}</button>}<button type="button" className="shift-button" disabled={busy} onClick={onClose}>Fermer</button><button type="submit" form="shift-editor" className="shift-button shift-primary" disabled={busy}><CheckIcon size={16}/>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>}>
    <form id="shift-editor" onSubmit={submit} className="shift-form">
      <Field label="Utilisateur" wide><select required value={values.userId} disabled={busy || !!record} onChange={event => set('userId', event.target.value)}><option value="">Choisir un utilisateur</option>{users.filter(user => user.isActive || user.id === values.userId).map(user => <option value={user.id} key={user.id}>{user.displayName}{!user.isActive ? ' · désactivé' : ''}</option>)}</select></Field>
      {isRule ? <>
        <fieldset className="shift-field-wide"><legend className="shift-label">Jours de travail</legend><div className="shift-weekdays">{WEEKDAYS.map((day, index) => <label key={day}><input type="checkbox" disabled={busy} checked={values.weekdays.includes(index + 1)} onChange={event => set('weekdays', event.target.checked ? [...values.weekdays, index + 1].sort() : values.weekdays.filter(value => value !== index + 1))}/><span>{day}</span></label>)}</div></fieldset>
        <Field label="Début"><input required disabled={busy} type="time" value={values.startTime} onChange={event => set('startTime', event.target.value)}/></Field>
        <Field label="Fin"><input required disabled={busy} type="time" value={values.endTime} onChange={event => set('endTime', event.target.value)}/></Field>
        <Field label="Fuseau horaire"><select disabled={busy} value={values.timeZone} onChange={event => set('timeZone', event.target.value)}>{ZONES.map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field label="À partir du"><input required disabled={busy} type="date" value={values.validFrom} onChange={event => set('validFrom', event.target.value)}/></Field>
        <Field label="Jusqu’au (facultatif)"><input disabled={busy} type="date" min={values.validFrom} value={values.validTo} onChange={event => set('validTo', event.target.value)}/></Field>
        <label className="shift-check"><input type="checkbox" disabled={busy} checked={values.active} onChange={event => set('active', event.target.checked)}/>Horaire actif</label>
        <p className="shift-hint shift-field-wide">Si l’heure de fin est antérieure à celle du début, le shift se termine le lendemain.</p>
      </> : <>
        {isAbsence && <label className="shift-check shift-field-wide"><input type="checkbox" checked={allDay} disabled={busy} onChange={event => setAllDay(event.target.checked)}/>Journée entière</label>}
        <Field label="Début"><input required disabled={busy} type={isAbsence && allDay ? 'date' : 'datetime-local'} value={isAbsence && allDay ? values.start.slice(0,10) : values.start} onChange={event => set('start', isAbsence && allDay ? `${event.target.value}T00:00` : event.target.value)}/></Field>
        <Field label={isAbsence && allDay ? 'Dernier jour inclus' : 'Fin'}><input required disabled={busy} type={isAbsence && allDay ? 'date' : 'datetime-local'} min={isAbsence && allDay ? values.start.slice(0,10) : values.start} value={isAbsence && allDay ? values.end.slice(0,10) : values.end} onChange={event => set('end', isAbsence && allDay ? `${event.target.value}T00:00` : event.target.value)}/></Field>
      </>}
      {isAbsence ? <Field label="Type d’absence" wide><select disabled={busy} value={values.type} onChange={event => set('type', event.target.value)}><option>Congé</option><option>Indisponible</option></select></Field> : <>
        <Field label="Pause non travaillée (minutes)"><input required type="number" min="0" max="1440" step="1" disabled={busy} value={values.breakMinutes} onChange={event => set('breakMinutes', event.target.value)}/></Field>
        <Field label="Mode de travail"><select disabled={busy} value={values.mode} onChange={event => set('mode', event.target.value)}>{MODES.map(value => <option key={value}>{value}</option>)}</select></Field>
      </>}
      {!isRule && <Field label="Commentaire (facultatif)" wide><textarea rows={3} maxLength={2000} disabled={busy} value={values.note} onChange={event => set('note', event.target.value)}/></Field>}
      {(error || validation) && <p className="shift-error shift-field-wide" role="alert">{validation || error}</p>}
    </form>
  </Modal>;
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const [zone, setZone] = useState('Africa/Tunis'), [view, setView] = useState('week'), [anchor, setAnchor] = useState(() => todayIn('Africa/Tunis'));
  const [data, setData] = useState(emptyData), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''), [userFilter, setUserFilter] = useState(''), [modeFilter, setModeFilter] = useState('');
  const [modal, setModal] = useState(null), [rulesOpen, setRulesOpen] = useState(false), [refresh, setRefresh] = useState(0);
  const [duplicate, setDuplicate] = useState(null);
  const [report, setReport] = useState(null), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('');
  const [now, setNow] = useState(Date.now());
  const generation = useRef(0);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const range = useMemo(() => {
    if (view === 'day') return { start: anchor, end: dateAdd(anchor, 1), days: [anchor] };
    if (view === 'week') { const start = monday(anchor); return { start, end: dateAdd(start, 7), days: Array.from({ length: 7 }, (_, index) => dateAdd(start, index)) }; }
    const first = `${anchor.slice(0, 7)}-01`, start = monday(first);
    return { start, end: dateAdd(start, 42), days: Array.from({ length: 42 }, (_, index) => dateAdd(start, index)) };
  }, [anchor, view]);
  const load = useCallback(async signal => {
    const request = ++generation.current; setLoading(true); setError('');
    try { const result = await api(null, range.start, range.end, signal); if (request === generation.current) setData(result); }
    catch (err) { if (err.name !== 'AbortError' && request === generation.current) setError(err.message); }
    finally { if (request === generation.current) setLoading(false); }
  }, [range.start, range.end]);
  useEffect(() => { if (!user?.isAdmin) return; const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load, refresh, user?.isAdmin]);
  const mutate = async body => {
    if (busy) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(body);
      setModal(null); setDuplicate(null);
      setNotice(result.message || (typeof result.created === 'number' ? `${result.created} shift${result.created > 1 ? 's' : ''} créé${result.created > 1 ? 's' : ''}${result.skipped ? ` · ${result.skipped} déjà existant${result.skipped > 1 ? 's' : ''}` : ''}.` : 'Planning enregistré.'));
      setRefresh(value => value + 1); return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  };
  const exportPdf = async () => {
    if (exporting) return; setExporting(true); setExportError('');
    try {
      const selectedUser = data.users.find(person => person.id === report.userId);
      if (!selectedUser) throw new Error('Choisissez un collaborateur.');
      const chunks = reportRanges(report.start, report.end), shifts = new Map(), absences = new Map();
      for (const chunk of chunks) { const result = await api(null, chunk.start, chunk.end); for (const item of result.shifts) shifts.set(item.id,item); for (const item of result.absences) absences.set(item.id,item); }
      const result = buildShiftReport({user:selectedUser,start:report.start,end:report.end,timeZone:report.timeZone,shifts:[...shifts.values()],absences:[...absences.values()]});
      const {buildShiftReportPdf,shiftReportFilename} = await import('../lib/shiftReportPdf.js');
      const doc = await buildShiftReportPdf(result); doc.save(shiftReportFilename(result));setReport(null);setNotice('Rapport PDF téléchargé.');
    } catch (err) { setExportError(err.message); } finally { setExporting(false); }
  };
  const openEditor = (kind, date = anchor, userId = '', record = null) => { setError(''); setModal({ kind, date, userId, record }); };
  const shifts = data.shifts.filter(activeRecord).filter(record => !modeFilter || record.mode === modeFilter);
  const absences = data.absences.filter(activeRecord);
  const users = data.users.filter(person => (!userFilter || person.id === userFilter) && String(person.displayName || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (person.isActive || shifts.some(item => item.userId === person.id) || absences.some(item => item.userId === person.id)));
  const name = id => data.users.find(person => person.id === id)?.displayName || 'Utilisateur';
  const forDay = (records, day, userId) => records.filter(record => (!userId || record.userId === userId) && zonedParts(record.start, zone).date <= day && zonedParts(new Date(Date.parse(record.end) - 1).toISOString(), zone).date >= day).sort((a, b) => a.start.localeCompare(b.start));
  const slotLabel = (record, day) => `${zonedParts(record.start, zone).date < day ? '00:00' : timeLabel(record.start, zone)} – ${zonedParts(record.end, zone).date > day ? '24:00' : timeLabel(record.end, zone)}`;
  const chip = (record, day, isAbsence = false, showUser = false) => <button key={record.id} type="button" className={`shift-slot ${isAbsence ? 'is-absence' : record.mode === 'À distance' ? 'is-remote' : ''}`} title={`${name(record.userId)} · ${slotLabel(record, day)}${record.note ? ` · ${record.note}` : ''}`} onClick={() => openEditor(isAbsence ? 'absence' : 'shift', day, record.userId, record)} disabled={busy}>
    {showUser && <strong>{name(record.userId)}</strong>}<span>{slotLabel(record, day)}</span><small>{isAbsence ? record.type : `${record.mode}${record.breakMinutes ? ` · pause ${record.breakMinutes} min` : ''}`}</small>{!isAbsence && Date.parse(record.start) <= now && Date.parse(record.end) > now && <small className="shift-now">Prévu en service</small>}
  </button>;
  const cancelRecord = () => {
    if (!modal?.record || !window.confirm(`Annuler ${modal.kind === 'absence' ? 'cette absence' : 'ce shift'} ?`)) return;
    mutate({ action: `cancel-${modal.kind}`, id: modal.record.id, expected: modal.record.revision });
  };
  const navigate = direction => {
    if (view === 'month') { const d = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + direction); setAnchor(d.toISOString().slice(0, 10)); }
    else setAnchor(dateAdd(anchor, direction * (view === 'week' ? 7 : 1)));
  };
  if (!user?.isAdmin) return <p className="p-6" role="alert">Accès réservé aux administrateurs.</p>;
  const periodLabel = view === 'month' ? prettyDate(`${anchor.slice(0, 7)}-01`, { month: 'long', year: 'numeric', day: undefined }) : view === 'day' ? prettyDate(anchor, { weekday: 'long', year: 'numeric' }) : `${prettyDate(range.start)} — ${prettyDate(dateAdd(range.end, -1), { year: 'numeric' })}`;
  return <div className="shifts-page">
    <div className="shift-page-heading"><div><Link className="shift-breadcrumb" to="/human-resources">Human ressources</Link><h1>Shift</h1><p>Le planning de travail de votre équipe.</p></div><div className="shift-heading-actions">
      <IconButton label="Télécharger un rapport PDF" disabled={busy || loading || !data.users.length} onClick={() => { setExportError(''); setReport({userId:userFilter || data.users.find(person=>person.isActive)?.id || data.users[0]?.id || '',start:range.start,end:dateAdd(range.end,-1),timeZone:zone}); }}><DownloadIcon size={18}/></IconButton>
      <IconButton label="Actualiser" disabled={busy || loading} onClick={() => setRefresh(value => value + 1)}><RefreshIcon size={18}/></IconButton>
      <IconButton label="Configurer les horaires récurrents" disabled={busy} onClick={() => { setError(''); setRulesOpen(true); }}><SettingsIcon size={18}/></IconButton>
      <IconButton label="Ajouter une absence" disabled={busy} onClick={() => openEditor('absence')}><CalendarIcon size={18}/></IconButton>
      <button type="button" className="shift-button shift-primary" disabled={busy} onClick={() => openEditor('shift')}><PlusIcon size={17}/>Ajouter un shift</button>
    </div></div>
    <div className="shift-controls"><div className="shift-view-switch" aria-label="Vue du planning">{[['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']].map(([id, label]) => <button type="button" key={id} aria-pressed={view === id} className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>{label}</button>)}</div>
      <div className="shift-period"><IconButton label="Période précédente" onClick={() => navigate(-1)}><ChevronLeftIcon size={17}/></IconButton><button className="shift-today" onClick={() => setAnchor(todayIn(zone))}>Aujourd’hui</button><IconButton label="Période suivante" onClick={() => navigate(1)}><ChevronRightIcon size={17}/></IconButton><h2>{periodLabel}</h2></div>
      <select aria-label="Fuseau horaire du planning" value={zone} onChange={event => setZone(event.target.value)}><option value="Africa/Tunis">Heure Tunisie</option><option value="Europe/Rome">Heure Italie</option></select>
    </div>
    <div className="shift-filters"><input type="search" aria-label="Rechercher un utilisateur" placeholder="Rechercher un utilisateur…" value={query} onChange={event => setQuery(event.target.value)}/><select aria-label="Filtrer par utilisateur" value={userFilter} onChange={event => setUserFilter(event.target.value)}><option value="">Toute l’équipe</option>{data.users.map(person => <option key={person.id} value={person.id}>{person.displayName}{person.isActive ? '' : ' · désactivé'}</option>)}</select><select aria-label="Filtrer par mode de travail" value={modeFilter} onChange={event => setModeFilter(event.target.value)}><option value="">Tous les modes</option>{MODES.map(value => <option key={value}>{value}</option>)}</select>
      <div className="shift-secondary-actions"><button className="shift-text-button" disabled={busy || loading} onClick={() => { setError(''); setDuplicate({ sourceStart: monday(anchor), targetStart: dateAdd(monday(anchor), 7) }); }}><CopyIcon size={15}/>Dupliquer la semaine</button><button className="shift-text-button" disabled={busy || loading || !data.rules.some(rule => rule.active)} onClick={() => { if (window.confirm(`Générer les shifts des horaires actifs du ${prettyDate(range.start)} au ${prettyDate(dateAdd(range.end, -1))} ? Les shifts déjà générés seront conservés.`)) mutate({ action: 'generate', start: range.start, end: range.end }); }}><ClockIcon size={15}/>Générer la période</button></div>
    </div>
    {notice && <p className="shift-notice" role="status"><CheckIcon size={16}/>{notice}</p>}
    {error && !modal && !duplicate && !rulesOpen && <p className="shift-error" role="alert">{error}</p>}
    <div className="shift-legend"><span className="is-onsite">Présentiel</span><span className="is-remote">À distance</span><span className="is-absence">Absence</span><p>Horaires planifiés · la présence réelle n’est pas pointée.</p></div>
    {loading ? <div className="shift-empty" role="status">Chargement du planning…</div> : view === 'week' ? <div className="shift-grid-scroll"><table className="shift-week-table"><thead><tr><th>Équipe</th>{range.days.map((day, index) => <th key={day} className={day === todayIn(zone) ? 'is-today' : ''}><span>{WEEKDAYS[index]}</span><strong>{prettyDate(day)}</strong></th>)}</tr></thead><tbody>{users.map(person => <tr key={person.id}><th><div className="shift-person"><span>{initials(person.displayName)}</span><div><strong>{person.displayName}</strong>{!person.isActive && <small>Désactivé</small>}</div></div></th>{range.days.map(day => <td key={day} className={day === todayIn(zone) ? 'is-today' : ''}>{forDay(shifts, day, person.id).map(record => chip(record, day))}{forDay(absences, day, person.id).map(record => chip(record, day, true))}<button className="shift-add-cell" title={`Ajouter un shift pour ${person.displayName}, ${prettyDate(day)}`} aria-label={`Ajouter un shift pour ${person.displayName}, ${prettyDate(day)}`} onClick={() => openEditor('shift', day, person.id)} disabled={!person.isActive || busy}><PlusIcon size={14}/></button></td>)}</tr>)}</tbody></table>{!users.length && <div className="shift-empty">Aucun utilisateur ne correspond aux filtres.</div>}</div> : view === 'day' ? <div className="shift-grid-scroll"><div className="shift-day-grid"><div className="shift-day-axis"><span>Équipe</span><div>{Array.from({ length: 13 }, (_, index) => <span key={index} style={{ left: `${index / 12 * 100}%` }}>{String(index * 2).padStart(2, '0')}:00</span>)}</div></div>{users.map(person => <div className="shift-day-row" key={person.id}><div className="shift-person"><span>{initials(person.displayName)}</span><div><strong>{person.displayName}</strong>{!person.isActive && <small>Désactivé</small>}</div></div><div className="shift-day-lanes">{[...forDay(shifts, anchor, person.id).map(record => ({ record, absence: false })), ...forDay(absences, anchor, person.id).map(record => ({ record, absence: true }))].map(({ record, absence }) => { const first = zonedParts(record.start, zone), last = zonedParts(record.end, zone), minute = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3)); const left = first.date < anchor ? 0 : minute(first.time), right = last.date > anchor ? 1440 : minute(last.time); return <div className="shift-day-event" key={record.id} style={{ marginLeft: `${left / 1440 * 100}%`, width: `${Math.max(right - left, 15) / 1440 * 100}%` }}>{chip(record, anchor, absence)}</div>; })}<button className="shift-day-add" disabled={!person.isActive || busy} title={`Ajouter un shift pour ${person.displayName}`} aria-label={`Ajouter un shift pour ${person.displayName}`} onClick={() => openEditor('shift', anchor, person.id)}><PlusIcon size={14}/></button></div></div>)}{!users.length && <div className="shift-empty">Aucun utilisateur ne correspond aux filtres.</div>}</div></div> : <div className="shift-month-scroll"><div className="shift-month-grid">{WEEKDAYS.map(day => <div className="shift-month-weekday" key={day}>{day}</div>)}{range.days.map(day => <div className={`shift-month-cell ${day.slice(0, 7) !== anchor.slice(0, 7) ? 'is-outside' : ''} ${day === todayIn(zone) ? 'is-today' : ''}`} key={day}><div className="shift-month-date"><button onClick={() => { setAnchor(day); setView('day'); }} title={`Voir le ${prettyDate(day)}`}>{Number(day.slice(-2))}</button><IconButton label={`Ajouter un shift le ${prettyDate(day)}`} disabled={busy} onClick={() => openEditor('shift', day)}><PlusIcon size={13}/></IconButton></div>{forDay(shifts, day).filter(record => users.some(person => person.id === record.userId)).map(record => chip(record, day, false, true))}{forDay(absences, day).filter(record => users.some(person => person.id === record.userId)).map(record => chip(record, day, true, true))}</div>)}</div></div>}
    {modal && <ShiftEditor key={`${modal.kind}:${modal.record?.id || 'new'}`} modal={modal} users={data.users} zone={zone} onClose={() => { if (!busy) { setModal(null); setError(''); } }} onSubmit={mutate} onCancel={cancelRecord} busy={busy} error={error}/>}
    {rulesOpen && !modal && <Modal title="Horaires récurrents" subtitle="Configurez les semaines types, puis générez les shifts sur la période souhaitée." size="lg" onClose={() => { if (!busy) { setRulesOpen(false); setError(''); } }} footer={<button className="shift-button shift-primary" onClick={() => openEditor('rule')} disabled={busy}><PlusIcon size={16}/>Ajouter un horaire</button>}>
      <div className="shift-rule-list">{data.rules.map(rule => <div className={`shift-rule ${rule.active ? '' : 'is-disabled'}`} key={rule.id}><div><strong>{name(rule.userId)}</strong><p>{rule.weekdays.map(day => WEEKDAYS[day - 1]).join(' · ')} · {rule.startTime} – {rule.endTime}</p><small>{rule.timeZone} · {rule.mode} · pause {rule.breakMinutes} min</small><small>Du {prettyDate(rule.validFrom)}{rule.validTo ? ` au ${prettyDate(rule.validTo)}` : ' · sans date de fin'} · {rule.active ? 'Actif' : 'Désactivé'}</small></div><div><IconButton label={`Modifier l’horaire de ${name(rule.userId)}`} disabled={busy} onClick={() => openEditor('rule', anchor, rule.userId, rule)}><PencilIcon size={16}/></IconButton>{rule.active && <IconButton label={`Désactiver l’horaire de ${name(rule.userId)}`} disabled={busy} onClick={() => mutate({ action: 'disable-rule', id: rule.id, expected: rule.revision })}><XIcon size={16}/></IconButton>}</div></div>)}{!data.rules.length && <p className="shift-empty">Aucun horaire récurrent. Ajoutez une semaine type pour commencer.</p>}</div>{error && <p className="shift-error" role="alert">{error}</p>}
    </Modal>}
    {report && <Modal title="Télécharger un rapport PDF" subtitle="Planning du collaborateur sur la période sélectionnée." onClose={()=>{if(!exporting)setReport(null);}} footer={<div className="shift-modal-actions"><button className="shift-button" disabled={exporting} onClick={()=>setReport(null)}>Fermer</button><button className="shift-button shift-primary" disabled={exporting || !report.userId || !report.start || !report.end} onClick={exportPdf}><DownloadIcon size={16}/>{exporting?'Préparation du PDF…':'Télécharger le PDF'}</button></div>}>
      <div className="shift-form"><Field label="Collaborateur" wide><select value={report.userId} disabled={exporting} onChange={event=>setReport(old=>({...old,userId:event.target.value}))}><option value="">Choisir un collaborateur</option>{data.users.map(person=><option key={person.id} value={person.id}>{person.displayName}{person.isActive?'':' · désactivé'}</option>)}</select></Field><Field label="Du"><input required type="date" disabled={exporting} value={report.start} onChange={event=>setReport(old=>({...old,start:event.target.value}))}/></Field><Field label="Au (inclus)"><input required type="date" disabled={exporting} min={report.start} value={report.end} onChange={event=>setReport(old=>({...old,end:event.target.value}))}/></Field><Field label="Fuseau horaire" wide><select disabled={exporting} value={report.timeZone} onChange={event=>setReport(old=>({...old,timeZone:event.target.value}))}><option value="Africa/Tunis">Heure Tunisie</option><option value="Europe/Rome">Heure Italie</option></select></Field><p className="shift-hint shift-field-wide">Période de 366 jours maximum. Inclut les horaires planifiés, pauses et absences. La présence réelle n’est pas pointée.</p>{exportError && <p className="shift-error shift-field-wide" role="alert">{exportError}</p>}</div>
    </Modal>}
    {duplicate && <Modal title="Dupliquer une semaine" subtitle="Les horaires seront copiés sur les mêmes jours de la semaine cible." onClose={() => { if (!busy) setDuplicate(null); }} footer={<button className="shift-button shift-primary" disabled={busy || !duplicate.sourceStart || !duplicate.targetStart} onClick={() => mutate({ action: 'duplicate-week', ...duplicate, timeZone: zone })}><CopyIcon size={16}/>{busy ? 'Duplication…' : 'Dupliquer'}</button>}><div className="shift-form"><Field label="Semaine source (lundi)"><input type="date" value={duplicate.sourceStart} disabled={busy} onChange={event => setDuplicate(old => ({ ...old, sourceStart: event.target.value ? monday(event.target.value) : '' }))}/></Field><Field label="Semaine cible (lundi)"><input type="date" value={duplicate.targetStart} disabled={busy} onChange={event => setDuplicate(old => ({ ...old, targetStart: event.target.value ? monday(event.target.value) : '' }))}/></Field></div><p className="shift-hint">Les conflits avec les shifts existants ou les absences seront signalés. Fuseau utilisé : {zone}.</p>{error && <p className="shift-error" role="alert">{error}</p>}</Modal>}
  </div>;
}
