import { useCallback, useEffect, useRef, useState } from 'react';
import { XIcon } from '../components/icons.jsx';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { admissionStatus, admissionWindowDays, parseAdmissionDate, safeUniversityUrl, universitySearchKey } from '../lib/universities.js';

const filters = [
  ['all', 'Toutes'],
  ['open', 'Ouvertes'],
  ['soon', 'Ouvrent bientôt'],
  ['deadlines', 'Ferment bientôt'],
  ['closed', 'Fermées'],
];
const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' });
const control = 'rounded-lg border border-border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy';
const linkStyle = 'font-medium text-navy underline underline-offset-2 break-all';

const statusBadges = [
  ['deadlines', 'Ferme bientôt', 'bg-amber-100 text-amber-900'],
  ['open', 'Ouverte', 'bg-emerald-100 text-emerald-900'],
  ['soon', 'Ouvre bientôt', 'bg-sky-100 text-navy'],
  ['planned', 'À venir', 'bg-sky-100 text-navy'],
  ['closed', 'Fermée', 'bg-slate-100 text-slate-700'],
];

function statusRank(status) {
  const index = statusBadges.findIndex(([key]) => status[key]);
  return index === -1 ? statusBadges.length : index;
}

function StatusBadges({ status }) {
  const badge = statusBadges[statusRank(status)];
  if (!badge) return null;
  const [, label, color] = badge;
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>
  );
}

function ExternalLink({ href, children }) {
  const url = safeUniversityUrl(href);
  return url ? <a className={linkStyle} href={url} target="_blank" rel="noreferrer">{children}</a> : null;
}

function displayDate(value) {
  const time = parseAdmissionDate(value);
  return time === null ? value : dateFormat.format(time);
}

function DetailSection({ title, fields, children }) {
  const filled = fields?.filter(([, value]) => typeof value === 'string' ? value.trim() : value != null && value !== false);
  if (!filled?.length && !children) return null;
  return (
    <section className="space-y-3 rounded-xl border border-border bg-white p-4">
      <h3 className="font-semibold text-navy">{title}</h3>
      {!!filled?.length && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {filled.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-medium text-text-muted">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

function SessionDetails({ session }) {
  if (!session || session.missing) return null;

  const links = [...new Set((session.links ?? '').match(/https?:\/\/[^\s<>"\]]+/gi) ?? [])].filter(safeUniversityUrl);
  return (
    <>
      <DetailSection title="Calendrier et frais" fields={[
        ['Ouverture publiée', session.opening],
        ['Échéance publiée', session.deadline],
        ['Année source', session.year],
        ['Frais de candidature', session.fees],
      ]} />
      <DetailSection title="Conditions et candidature" fields={[
        ['Langue', session.language],
        ['Moyenne minimale (CGPA)', session.average],
        ['Modalités de candidature', session.method],
      ]}>
        {links.length > 0 ? (
          <ul className="space-y-2">{links.map(url => <li key={url}><ExternalLink href={url}>{url}</ExternalLink></li>)}</ul>
        ) : session.links?.trim() ? <p className="break-words text-text-muted">{session.links}</p> : null}
      </DetailSection>
      <DetailSection title="Vérification" fields={[
        ['Dernière vérification', displayDate(session.checkedAt)],
      ]} />
      {session.history?.trim() && (
        <DetailSection title="Historique des changements">
          <p className="whitespace-pre-wrap break-words">{session.history}</p>
        </DetailSection>
      )}
    </>
  );
}

function SessionPanel({ row, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const panel = dialog.current;
    panel.showModal();
    return () => { if (panel.open) panel.close(); };
  }, []);
  const { university, session, status } = row;
  const close = () => {
    dialog.current.close();
    onClose();
  };
  return (
    <dialog ref={dialog} aria-labelledby="university-session-title" onCancel={event => { event.preventDefault(); close(); }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-xl overflow-hidden bg-white text-text-strong shadow-xl backdrop:bg-navy/40">
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 space-y-2">
            <h2 id="university-session-title" className="break-words text-lg font-semibold text-navy">{university.name || 'Établissement sans nom'}</h2>
            {session?.title && <p className="break-words text-sm text-text-muted">{session.title}</p>}
            <StatusBadges status={status} />
          </div>
          <button type="button" onClick={close} aria-label="Fermer la fiche" className={`${control} shrink-0 text-navy hover:bg-canvas`}>
            <XIcon size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-canvas p-4 text-sm sm:p-6">
          <SessionDetails session={session} />
          {safeUniversityUrl(university.source) && <p><ExternalLink href={university.source}>Source du répertoire</ExternalLink></p>}
        </div>
      </div>
    </dialog>
  );
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const request = useRef(null);

  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/universities', { signal: controller.signal, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!controller.signal.aborted) {
        setUniversities(data.universities);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof SyntaxError ? 'Le répertoire est indisponible.' : err.message || 'Le répertoire est indisponible.');
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);
  usePageRefreshRegistration({ lastUpdated, refresh, loading });

  const search = universitySearchKey(query);
  const now = new Date();
  const results = universities
    .flatMap(university => (university.sessions.length ? university.sessions : [null]).map(session => ({
      university, session, status: admissionStatus(session ?? {}, now),
    })))
    .filter(({ university, session, status }) => (filter === 'all' || status[filter])
      && (universitySearchKey(university.name).includes(search) || universitySearchKey(session?.title).includes(search)))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status)
      || collator.compare(a.university.name ?? '', b.university.name ?? ''));
  const universityCount = new Set(results.map(({ university }) => university.id)).size;
  const sessionCount = results.filter(({ session }) => session).length;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-navy">Universities</h1>
        <p className="mt-1 text-sm text-text-muted">Répertoire des établissements et de leurs sessions d’admission dans Airtable.</p>
      </header>
      <section aria-label="Recherche et filtres" className="space-y-4 rounded-xl border border-border bg-white p-4 sm:p-6">
        <label className="block max-w-lg text-sm font-medium text-navy">
          Rechercher un établissement ou une session
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} className={`mt-2 block w-full ${control}`} placeholder="Ex. Bologna" />
        </label>
        <div role="group" aria-label="Statut des admissions" className="flex flex-wrap gap-2">
          {filters.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
              className={`${control} text-sm font-medium ${filter === key ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-sky-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Statuts basés sur les dates et indications publiées dans Airtable. « Bientôt » couvre les {admissionWindowDays} prochains jours.
        </p>
      </section>
      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}{lastUpdated && ' Les résultats précédemment chargés restent affichés.'}{' '}
          <button type="button" onClick={refresh} className="font-medium underline">Réessayer</button>
        </div>
      )}
      {loading && <p role="status" className="text-sm text-text-muted">Chargement du répertoire…</p>}
      {lastUpdated && (
        <section aria-label="Résultats" className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
            <p role="status" className="text-sm font-semibold text-navy">
              {sessionCount} session{sessionCount !== 1 ? 's' : ''} · {universityCount} établissement{universityCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-text-muted">Ouvrez une fiche pour consulter les conditions, les liens et l’historique.</p>
            {results.length > 0 && <p className="w-full text-xs text-text-muted lg:hidden">Faites défiler le tableau pour voir toutes les colonnes.</p>}
          </div>
          {results.length === 0 ? (
            <p className="border-t border-border p-6 text-sm text-text-muted">Aucun résultat ne correspond aux critères.</p>
          ) : (
            <div role="region" aria-label="Tableau des sessions d’admission" tabIndex={0} className="overflow-x-auto focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-navy">
              <table className="w-full min-w-[870px] table-fixed text-left text-sm">
                <caption className="sr-only">Sessions d’admission par établissement</caption>
                <thead className="border-y border-border bg-canvas text-xs text-navy">
                  <tr>
                    <th scope="col" className="w-[32%] px-4 py-3 font-semibold sm:px-5">Université / session</th>
                    <th scope="col" className="w-[16%] px-3 py-3 font-semibold">Statut</th>
                    <th scope="col" className="w-[15%] px-3 py-3 font-semibold">Ouverture publiée</th>
                    <th scope="col" className="w-[15%] px-3 py-3 font-semibold">Échéance publiée</th>
                    <th scope="col" className="w-[13%] px-3 py-3 font-semibold">Frais</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map(row => {
                    const { university, session, status } = row;
                    const name = university.name || 'Établissement sans nom';
                    const subtitle = session?.title;
                    return (
                      <tr key={`${university.id}/${session?.id ?? ''}`} className="hover:bg-sky-50/60">
                        <th scope="row" className="px-4 py-3 font-normal sm:px-5">
                          <span className="block break-words font-semibold text-navy">{name}</span>
                          {subtitle && <span className="mt-1 block break-words text-xs text-text-muted">{subtitle}</span>}
                        </th>
                        <td className="px-3 py-3"><StatusBadges status={status} /></td>
                        <td className="break-words px-3 py-3">{displayDate(session?.opening)}</td>
                        <td className="break-words px-3 py-3">{displayDate(session?.deadline)}</td>
                        <td className="whitespace-pre-line break-words px-3 py-3">{session?.fees}</td>
                        <td className="px-2 py-3">
                          {(session && !session.missing || safeUniversityUrl(university.source)) && (
                            <button type="button" aria-haspopup="dialog" aria-label={['Détails', name, subtitle].filter(Boolean).join(' · ')}
                            onClick={() => setSelectedRow(row)}
                            className={`${control} px-2 text-xs font-medium text-navy hover:border-navy hover:bg-white`}>
                            Détails
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {selectedRow && <SessionPanel row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}
