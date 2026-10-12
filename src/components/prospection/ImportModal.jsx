import { useMemo, useState } from 'react';
import Modal from '../Modal.jsx';
import { LEAD_FIELDS, mappedLead, leadError } from '../../lib/prospection.js';
import { readLeadWorkbook } from '../../lib/prospectionImport.js';
import { Field, ErrorMessage, inputClass, buttonClass, primaryClass, prospectionApi } from './controls.jsx';

const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const aliases = { lastName: ['nom', 'last name', 'lastname', 'name', 'nom et prenom', 'full name'], firstName: ['prenom', 'first name', 'firstname'], phone: ['telephone', 'phone', 'phone number', 'numero', 'numero de telephone', 'whatsapp'], email: ['email', 'e-mail', 'mail', 'adresse mail'], source: ['source', 'lead source'], interest: ['interet', 'interest'], followUp: ['date de rappel', 'rappel', 'follow-up date'] };
export default function ImportModal({ onClose, onImported }) {
  const [sheets, setSheets] = useState([]), [sheet, setSheet] = useState(0), [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(0);
  const [importId, setImportId] = useState(() => crypto.randomUUID());
  const [started, setStarted] = useState(false), [complete, setComplete] = useState(false);
  const rows = sheets[sheet]?.rows || [], headers = rows[0] || [];
  const mapped = useMemo(() => rows.slice(1).map((row, index) => ({ index, input: mappedLead(row, mapping), blank: !row.some(cell => String(cell ?? '').trim()) })).filter(row => !row.blank).map(row => ({ ...row, error: leadError(row.input) })), [rows, mapping]);
  const valid = mapped.filter(row => !row.error), invalid = mapped.filter(row => row.error);
  const selectSheet = (index, workbook = sheets) => {
    setSheet(index); const columns = workbook[index]?.rows[0] || [];
    setMapping(Object.fromEntries(LEAD_FIELDS.map(([key]) => [key, String(columns.findIndex(column => aliases[key].includes(fold(column)))).replace(/^-1$/, '')])));
  };
  const changeMapping = (key, column) => setMapping(previous => Object.fromEntries(LEAD_FIELDS.map(([field]) => [field, field === key ? column : column !== '' && previous[field] === column ? '' : previous[field] ?? ''])));
  async function load(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError(''); setSheets([]); setDone(0); setStarted(false); setComplete(false);
    try {
      const workbook = (await readLeadWorkbook(file)).map(item => ({ ...item, rows: item.rows.filter(row => row.some(cell => String(cell ?? '').trim())) }));
      if (!workbook.length || workbook.every(item => item.rows.length < 2)) throw new Error('Le fichier doit contenir une ligne d’en-têtes et des données.');
      if (workbook.some(item => item.rows.length > 5001)) throw new Error('Maximum 5 000 lignes par feuille.');
      setSheets(workbook); selectSheet(0, workbook); setImportId(crypto.randomUUID());
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function runImport() {
    if (busy || !valid.length || complete) return;
    setBusy(true); setStarted(true); setError('');
    let cursor = done;
    try {
      for (; cursor < valid.length; cursor += 10) {
        const batch = valid.slice(cursor, cursor + 10).map(({ index, input }) => ({ index, input }));
        const result = await prospectionApi({ action: 'import', importId, rows: batch });
        onImported(result.leads); setDone(Math.min(cursor + 10, valid.length));
      }
      setComplete(true);
    } catch (err) { setError(`${err.message} ${Math.min(cursor, valid.length)} lignes confirmées. Reprenez l’import avec le même fichier pour éviter les doublons de ce lot.`); }
    finally { setBusy(false); }
  }
  return <Modal title="Importer des leads" onClose={() => { if (!busy) onClose(); }} size="xl">
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Excel .xlsx ou CSV · 5 Mo maximum · 5 000 lignes. Première ligne : noms des colonnes. Dates au format AAAA-MM-JJ ; téléphones au format texte avec indicatif pays.</p>
      <input aria-label="Fichier Excel ou CSV" type="file" accept=".xlsx,.csv" onChange={load} disabled={busy || started} className={inputClass} />
      {!!sheets.length && <>
        <Field label="Feuille"><select className={inputClass} value={sheet} disabled={busy || started} onChange={event => selectSheet(Number(event.target.value))}>{sheets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</select></Field>
        <fieldset disabled={busy || started} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{LEAD_FIELDS.map(([key, label]) => <Field key={key} label={label}><select className={inputClass} value={mapping[key] ?? ''} onChange={event => changeMapping(key, event.target.value)}><option value="">Ne pas importer{key === 'interest' ? ' (Non contacté)' : ''}</option>{Array.from({ length: headers.length }, (_, index) => <option key={index} value={index}>{headers[index] || `Colonne ${index + 1}`}</option>)}</select></Field>)}</fieldset>
        <p className="text-xs text-text-muted">Une colonne correspond à un seul champ. Pour un nom complet dans une seule colonne, associez-la à Nom et laissez Prénom vide.</p>
        <p role="status" className="text-sm text-text-strong">{valid.length} lignes valides · {invalid.length} lignes ignorées{started ? ` · ${done}/${valid.length} enregistrées` : ''}</p>
        {!!invalid.length && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p>Les lignes invalides ne seront pas importées.</p>{invalid.slice(0, 5).map(row => <p key={row.index}>Ligne {row.index + 2} : {row.error}</p>)}</div>}
        <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><caption className="p-3 text-left text-text-muted">Aperçu des 5 premières lignes</caption><thead className="bg-canvas"><tr>{LEAD_FIELDS.map(([key, label]) => <th className="whitespace-nowrap px-3 py-2" key={key}>{label}</th>)}</tr></thead><tbody>{mapped.slice(0, 5).map(row => <tr key={row.index} className="border-t border-border">{LEAD_FIELDS.map(([key]) => <td className="max-w-48 truncate px-3 py-2" key={key}>{row.input[key] || '—'}</td>)}</tr>)}</tbody></table></div>
      </>}
      <ErrorMessage>{error}</ErrorMessage>
      {complete && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Import terminé : {done} leads enregistrés.</p>}
      <div className="flex justify-end gap-2"><button className={buttonClass} disabled={busy} onClick={onClose}>{complete ? 'Fermer' : 'Annuler'}</button>{!complete && <button className={primaryClass} disabled={busy || !valid.length} onClick={runImport}>{busy ? 'Traitement…' : started ? 'Reprendre l’import' : `Importer ${valid.length} leads`}</button>}</div>
    </div>
  </Modal>;
}
