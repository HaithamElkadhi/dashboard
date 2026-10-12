import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePageRefreshRegistration } from '../../contexts/PageRefreshContext.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import Pagination from '../../components/Pagination.jsx';
import Modal from '../../components/Modal.jsx';
import LeadModal from '../../components/prospection/LeadModal.jsx';
import ActivityModal from '../../components/prospection/ActivityModal.jsx';
import ImportModal from '../../components/prospection/ImportModal.jsx';
import WhatsAppModal from '../../components/prospection/WhatsAppModal.jsx';
import { WhatsAppIcon, TrashIcon, PencilIcon, MailIcon } from '../../components/icons.jsx';
import { ErrorMessage, inputClass, buttonClass, primaryClass, actionClasses, prospectionApi } from '../../components/prospection/controls.jsx';
import { INTERESTS } from '../../lib/prospection.js';
import EmailModal from '../../components/prospection/EmailModal.jsx';

const displayDate = value => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleString('fr-FR', value.length === 10 ? { dateStyle: 'short' } : { dateStyle: 'short', timeStyle: 'short' }) : '—';
const interestClass = value => value === 'Intéressé' ? 'bg-emerald-50 text-emerald-800' : value === 'Non intéressé' ? 'bg-red-50 text-red-700' : value === 'Injoignable' ? 'bg-amber-50 text-amber-800' : 'bg-canvas text-text-muted';
export default function ProspectionPage() {
  const { canWrite } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedLead = params.get('lead');
  const [leads, setLeads] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [lastUpdated, setLastUpdated] = useState(null);
  const [query, setQuery] = useState(''), [interest, setInterest] = useState('All');
  const [editor, setEditor] = useState(null), [activity, setActivity] = useState(null), [importing, setImporting] = useState(false);
  const [emailFor, setEmailFor] = useState(null);
  const [whatsappFor, setWhatsappFor] = useState(null);
  const [deleting, setDeleting] = useState(null), [busy, setBusy] = useState(false), [deleteError, setDeleteError] = useState('');
  const refresh = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/prospection', { signal }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible de charger les leads.');
      setLeads(result.leads); setLastUpdated(new Date());
    } catch (err) { if (!signal?.aborted) setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  usePageRefreshRegistration({ lastUpdated, refresh, loading });
  const merge = incoming => setLeads(previous => { const map = new Map(previous.map(lead => [lead.id, lead])); for (const lead of incoming) map.set(lead.id, lead); return [...map.values()]; });
  useEffect(() => {
    if (!requestedLead) return;
    const lead = leads.find(item => item.id === requestedLead);
    if (lead) { setActivity(lead); setParams(previous => { const next = new URLSearchParams(previous); next.delete('lead'); return next; }, { replace: true }); }
  }, [requestedLead, leads, setParams]);
  const filtered = useMemo(() => leads.filter(lead => {
    const match = `${lead.name} ${lead.email} ${lead.phone} ${lead.source}`.toLowerCase().includes(query.trim().toLowerCase());
    return match && (interest === 'All' || lead.interest === interest);
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr')), [leads, query, interest]);
  const pagination = usePagination(filtered, { resetKey: `${query}:${interest}` });
  async function remove() {
    if (busy) return; setBusy(true); setDeleteError('');
    try { await prospectionApi({ action: 'delete', id: deleting.id }); setLeads(previous => previous.filter(lead => lead.id !== deleting.id)); setDeleting(null); }
    catch (err) { setDeleteError(err.message); } finally { setBusy(false); }
  }
  const actions = lead => <div className="flex flex-wrap gap-2">
    <button type="button" className={`${actionClasses.whatsapp} min-w-11`} onClick={() => setWhatsappFor(lead)} title="WhatsApp" aria-label={`WhatsApp ${lead.name}`}><WhatsAppIcon size={18} /></button>
    {canWrite && <button type="button" className={`${actionClasses.edit} min-w-11`} title="Envoyer un email" aria-label={`Email ${lead.name}`} onClick={() => setEmailFor(lead)}><MailIcon size={18} /></button>}
    <button className={actionClasses.edit} onClick={() => setActivity(lead)}>Activité</button>
    {canWrite && <><button type="button" className={`${actionClasses.edit} min-w-11`} title="Modifier" aria-label={`Modifier ${lead.name}`} onClick={() => setEditor(lead)}><PencilIcon size={18} /></button><button type="button" className={`${actionClasses.delete} min-w-11`} title="Supprimer" aria-label={`Supprimer ${lead.name}`} onClick={() => { setDeleting(lead); setDeleteError(''); }}><TrashIcon size={18} /></button></>}
  </div>;
  return <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6">
    <Link to="/operations" className="text-sm text-brand hover:underline">← Operations</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-text-strong">Prospection</h1><p className="mt-1 text-sm text-text-muted">Vos leads et l’historique des appels.</p></div>{canWrite && <div className="flex gap-2"><button className={buttonClass} onClick={() => setImporting(true)}>Importer Excel</button><button className={primaryClass} onClick={() => setEditor({ new: true })}>Ajouter un lead</button></div>}</div>
    <nav aria-label="Leads par intérêt" className="flex flex-wrap gap-2">
      {['All', ...INTERESTS].map(value => {
        const selected = interest === value;
        const count = value === 'All' ? leads.length : leads.filter(lead => lead.interest === value).length;
        return <button type="button" key={value} aria-pressed={selected} onClick={() => setInterest(value)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${selected ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-text-strong hover:bg-canvas'}`}>
          {value === 'All' ? 'Tous' : value}<span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-white/20 text-white' : 'bg-canvas text-text-muted'}`}>{count}</span>
        </button>;
      })}
    </nav>
    <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-4">
      <input aria-label="Rechercher un lead" placeholder="Nom, email, téléphone, source…" value={query} onChange={event => setQuery(event.target.value)} className={`${inputClass} sm:max-w-sm`} />
      <button className={buttonClass} disabled={loading} onClick={() => refresh()}>{loading ? 'Chargement…' : 'Actualiser'}</button>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
    <p role="status" className="text-sm text-text-muted">{filtered.length} leads{loading ? ' · Chargement…' : ''}</p>
    {!loading && !filtered.length && <p className="rounded-xl border border-border bg-surface p-8 text-center text-text-muted">{leads.length ? 'Aucun lead ne correspond aux filtres.' : 'Aucun lead. Ajoutez un contact ou importez un fichier Excel.'}</p>}
    {!!filtered.length && <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface lg:block"><table className="w-full text-left text-sm"><thead className="bg-canvas text-text-muted"><tr>{['Nom / Prénom', 'Contact', 'Source', 'Intérêt', 'Dernier appel', 'Actions'].map(label => <th key={label} className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{pagination.pageItems.map(lead => <tr key={lead.id} className="border-t border-border hover:bg-canvas/40"><td className="max-w-52 break-words px-4 py-3 font-medium text-text-strong">{lead.name}</td><td className="max-w-64 break-words px-4 py-3"><p>{lead.email || '—'}</p><p className="text-text-muted">{lead.phone || '—'}</p></td><td className="max-w-36 break-words px-4 py-3">{lead.source || '—'}</td><td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${interestClass(lead.interest)}`}>{lead.interest}</span></td><td className="whitespace-nowrap px-4 py-3">{displayDate(lead.lastCall)}</td><td className="px-4 py-3">{actions(lead)}</td></tr>)}</tbody></table></div>
      <div className="space-y-3 lg:hidden">{pagination.pageItems.map(lead => <article key={lead.id} className="space-y-3 rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="break-words font-semibold text-text-strong">{lead.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs ${interestClass(lead.interest)}`}>{lead.interest}</span></div><p className="break-words text-sm">{lead.email || '—'} · {lead.phone || '—'}</p><p className="text-sm text-text-muted">Source : {lead.source || '—'}<br />Dernier appel : {displayDate(lead.lastCall)}</p>{actions(lead)}</article>)}</div>
      <Pagination {...pagination} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
    </>}
    {emailFor && <EmailModal lead={emailFor} onClose={() => setEmailFor(null)} />}
    {whatsappFor && <WhatsAppModal lead={whatsappFor} canWrite={canWrite} onClose={() => setWhatsappFor(null)} onSaved={lead => merge([lead])} />}
    {editor && <LeadModal lead={editor.new ? null : editor} onClose={() => setEditor(null)} onSaved={lead => { merge([lead]); setEditor(null); }} />}
    {activity && <ActivityModal lead={activity} canWrite={canWrite} onClose={() => setActivity(null)} onSaved={lead => merge([lead])} />}
    {importing && <ImportModal onClose={() => setImporting(false)} onImported={merge} />}
    {deleting && <Modal title="Supprimer ce lead ?" onClose={() => { if (!busy) setDeleting(null); }}><div className="space-y-4"><p className="text-sm">Le contact « {deleting.name} » sera supprimé. Les appels déjà enregistrés restent conservés dans Airtable.</p><ErrorMessage>{deleteError}</ErrorMessage><div className="flex justify-end gap-2"><button className={buttonClass} disabled={busy} onClick={() => setDeleting(null)}>Annuler</button><button className={`${buttonClass} border-red-700 bg-red-700 text-white hover:bg-red-800`} disabled={busy} onClick={remove}>{busy ? 'Suppression…' : 'Supprimer'}</button></div></div></Modal>}
  </div>;
}
