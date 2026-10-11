import { useEffect, useMemo, useRef, useState } from 'react';
import './attendance.css';

const statuses = ['Présent', 'Absent', 'Retard'];
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const label = student => student.fields?.['Nom complet'] || 'Élève';

export default function AttendanceCalendar({ tables, onSave, onOpenStudent, onDirtyChange, onBusyChange, onReload }) {
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [classId, setClassId] = useState(() => tables.classes?.[0]?.id || '');
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const baseline = useRef('{}');
  const dirty = JSON.stringify(marks) !== baseline.current;
  useEffect(() => { onDirtyChange?.(dirty || busy); }, [dirty, busy, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { onBusyChange?.(false); }, [onBusyChange]);
  const roster = useMemo(() => (tables.students || []).filter(student => student.fields?.Classe?.includes(classId)).sort((a, b) => label(a).localeCompare(label(b), 'fr')), [tables.students, classId]);
  const savedMarks = useMemo(() => Object.fromEntries((tables.attendance || []).filter(record => record.fields?.Date?.slice(0, 10) === date && record.fields?.Classe?.includes(classId)).map(record => [record.fields?.Élève?.[0], record.fields?.Présence])), [tables.attendance, date, classId]);
  useEffect(() => {
    if (!dirty) { setMarks(savedMarks); baseline.current = JSON.stringify(savedMarks); }
  }, [savedMarks]); // Preserve an unsaved draft when refreshed data arrives.
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { if (!classId && tables.classes?.length) setClassId(tables.classes[0].id); }, [classId, tables.classes]);
  const navigate = action => {
    if (busy || (dirty && !window.confirm('Abandonner cet appel non enregistré ?'))) return;
    baseline.current = JSON.stringify(savedMarks); setMarks(savedMarks); setError(''); setNotice(''); action();
  };
  const days = useMemo(() => {
    const start = new Date(month); start.setDate(1 - (start.getDay() + 6) % 7);
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [month]);
  const absences = useMemo(() => {
    const counts = {};
    for (const record of tables.attendance || []) if (record.fields?.Présence === 'Absent' && record.fields?.Classe?.includes(classId)) {
      const key = record.fields.Date?.slice(0, 10); counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [tables.attendance, classId]);
  const complete = roster.length > 0 && roster.every(student => statuses.includes(marks[student.id]));
  const save = async () => {
    if (!complete || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const expected = (tables.attendance || []).filter(record => record.fields?.Date?.slice(0, 10) === date && record.fields?.Classe?.includes(classId)).map(record => ({ id: record.id, fields: record.fields }));
      const result = await onSave({ action: 'attendance', date, classId, expected, marks: roster.map(student => ({ studentId: student.id, status: marks[student.id] })) });
      const confirmedMarks = Array.isArray(result?.records)
        ? Object.fromEntries(result.records.filter(record => record.fields?.Date?.slice(0, 10) === date && record.fields?.Classe?.includes(classId)).map(record => [record.fields?.Élève?.[0], record.fields?.Présence]))
        : marks;
      baseline.current = JSON.stringify(confirmedMarks); setMarks(confirmedMarks); setNotice('Appel enregistré.');
    } catch (err) { setError(err.message || 'Impossible d’enregistrer cet appel.'); }
    finally { setBusy(false); }
  };
  return <section className="edu-attendance">
    <div className="edu-card edu-attendance-calendar">
      <div className="edu-section-heading"><h2>Absences et appel</h2><button className="edu-button" disabled={busy} onClick={() => navigate(() => { setDate(today()); setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); })}>Aujourd’hui</button></div>
      <label className="edu-attendance-class">Classe<select aria-label='Classe de l’appel' value={classId} disabled={busy} onChange={event => navigate(() => setClassId(event.target.value))}><option value="">Choisir une classe</option>{(tables.classes || []).map(item => <option key={item.id} value={item.id}>{item.fields?.Classe || 'Classe'}</option>)}</select></label>
      <div className="edu-attendance-month"><button className="edu-button" aria-label="Mois précédent" disabled={busy} onClick={() => navigate(() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)))}>‹</button><strong>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong><button className="edu-button" aria-label="Mois suivant" disabled={busy} onClick={() => navigate(() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)))}>›</button></div>
      <div className="edu-attendance-grid">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => <span className="edu-attendance-weekday" key={day}>{day}</span>)}{days.map(day => {
        const key = iso(day), count = absences[key] || 0;
        return <button type="button" key={key} disabled={busy} aria-pressed={date === key} aria-current={key === today() ? 'date' : undefined} aria-label={`${day.toLocaleDateString('fr-FR', { dateStyle: 'full' })}${count ? `, ${count} absent${count > 1 ? 's' : ''}` : ''}`} className={`edu-attendance-day ${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === date ? 'selected' : ''}`} onClick={() => navigate(() => { setDate(key); setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); })}><span>{day.getDate()}</span>{count > 0 && <small>{count} abs.</small>}</button>;
      })}</div>
    </div>
    <div className="edu-card edu-attendance-roster"><div className="edu-section-heading"><h2>Appel du {new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR')}</h2><button disabled={!roster.length || busy} className="edu-button" onClick={() => setMarks(Object.fromEntries(roster.map(student => [student.id, 'Présent'])))}>Tous présents</button></div>
      {!classId ? <p>Choisissez une classe pour faire l’appel.</p> : !roster.length ? <p>Aucun élève dans cette classe.</p> : <><p className="edu-muted">{roster.filter(student => statuses.includes(marks[student.id])).length} / {roster.length} élèves renseignés</p><div className="edu-attendance-students">{roster.map(student => <div className="edu-attendance-student" key={student.id}><div><button className="edu-attendance-name" type="button" disabled={busy} onClick={() => { if (!busy && (!dirty || window.confirm('Abandonner cet appel non enregistré ?'))) onOpenStudent?.(student.id); }}>{label(student)}</button>{savedMarks[student.id] && <small className="edu-attendance-saved">Enregistré : {savedMarks[student.id]}</small>}</div><label><span className="edu-attendance-sr">Présence de {label(student)}</span><select aria-label={'Présence de ' + label(student)} disabled={busy} value={marks[student.id] || ''} onChange={event => { setNotice(''); setMarks(old => ({ ...old, [student.id]: event.target.value })); }}><option value="">À renseigner</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></div>)}</div><div className="edu-actions"><button className="edu-button edu-primary" disabled={!complete || busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer l’appel'}</button></div>{!complete && <p className="edu-muted">Renseignez chaque élève pour enregistrer.</p>}</>}
      {error && <div role="alert" className="edu-error"><p>{error}</p>{onReload && <button className="edu-button" disabled={busy} onClick={() => navigate(onReload)}>Recharger l’appel</button>}</div>}{notice && <p role="status">{notice}</p>}
    </div>
  </section>;
}
