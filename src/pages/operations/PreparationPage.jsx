import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchProspectsForSearch } from '../../lib/airtable.js';
import AdmissionRequirements from '../../components/documents/AdmissionRequirements.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PreparationTimeline from '../../components/prospects/PreparationTimeline.jsx';

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const progressColors = {
  low: { accent: '#B83232', surface: '#FEF2F2' },
  medium: { accent: '#9A4B08', surface: '#FFF7ED' },
  high: { accent: '#217A50', surface: '#F0FDF4' },
};
function colorsForProgress(percent) {
  if (percent < 20) return progressColors.low;
  if (percent < 60) return progressColors.medium;
  return progressColors.high;
}

const control = 'min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/20';
async function loadCohort(params, signal) {
  const response = await fetch('/api/preparation-list?' + new URLSearchParams(params), { cache: 'no-store', signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Impossible de charger les candidats.');
  return result;
}

export default function PreparationPage() {
  const { canWrite } = useAuth();
  const [params, setParams] = useSearchParams();
  const candidates = params.get('group') === 'candidate';
  const year = candidates ? params.get('year') || '' : '';
  const studentId = params.get('studentId') || '';
  const scope = candidates ? 'candidate:' + year : 'all';
  const [requiredFor, setRequiredFor] = useState('');
  const [timelineRevision, setTimelineRevision] = useState(0);
  const [cohort, setCohort] = useState(null);
  const [years, setYears] = useState(null);
  const [yearsError, setYearsError] = useState('');
  const [yearsRevision, setYearsRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(value => value + 1);

  useEffect(() => {
    if (!candidates) return;
    const controller = new AbortController();
    setYears(null); setYearsError('');
    loadCohort({ mode: 'years' }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setYears(result); })
      .catch(failure => { if (!controller.signal.aborted) setYearsError(failure.message); });
    return () => controller.abort();
  }, [candidates, yearsRevision]);

  useEffect(() => {
    if (candidates && !year) { setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    async function load() {
      try {
        const result = candidates
          ? await loadCohort({ mode: 'list', year }, controller.signal)
          : { students: (await fetchProspectsForSearch()).sort((a, b) => a.fullName.localeCompare(b.fullName)), stats: null };
        if (!controller.signal.aborted) setCohort({ ...result, scope });
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message || 'Impossible de charger les étudiants.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [candidates, year, scope, revision]);

  const current = cohort?.scope === scope ? cohort : null;
  const students = current?.students || [];
  const student = students.find(item => item.id === studentId);
  const matches = students.filter(item => fold(item.fullName + ' ' + item.email + ' ' + item.phone + ' ' + (item.prospectId || '')).includes(fold(query.trim())));
  function changeFilter(group, selectedYear = '') {
    setRequiredFor(''); setPicking(false); setQuery('');
    setParams(group === 'candidate' ? { group, ...(selectedYear ? { year: selectedYear } : {}) } : {});
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <Link to="/operations" className="inline-flex min-h-11 items-center rounded text-sm font-medium text-navy hover:underline focus-visible:outline focus-visible:outline-2">← Operations</Link>
      <h1 className="text-2xl font-semibold text-navy">Préparation</h1>
      <section aria-label="Filtres des dossiers" className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-navy"><span>Dossiers</span>
          <select className={control} value={candidates ? 'candidate' : 'all'} onChange={event => changeFilter(event.target.value)}>
            <option value="all">Tous les dossiers</option><option value="candidate">Candidats</option>
          </select>
        </label>
        {candidates && <div>
          <label className="block space-y-2 text-sm font-medium text-navy"><span>Année scolaire</span>
            <select className={control} value={year} disabled={!years} onChange={event => changeFilter('candidate', event.target.value)}>
              <option value="">{years ? 'Choisir une année scolaire' : 'Chargement des années…'}</option>
              {years && <option value="all">Toutes les années ({years.total})</option>}
              {years?.years.map(option => <option key={option.value} value={option.value}>{option.value === '__none__' ? 'Année non renseignée' : option.value} ({option.count})</option>)}
            </select>
          </label>
          {yearsError && <div className="mt-2 text-sm text-red-700"><p role="alert">{yearsError}</p><button className="min-h-11 underline" onClick={() => setYearsRevision(value => value + 1)}>Réessayer</button></div>}
        </div>}
      </section>
      {candidates && !year ? <p role="status" className="text-sm text-text-muted">Choisissez une année scolaire pour charger les candidats et leurs statistiques.</p> : <>
        {loading && <p role="status" className="text-sm text-text-muted">Chargement des dossiers…</p>}
        {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700"><p role="alert">{error}</p><button className="min-h-11 underline" onClick={refresh}>Réessayer</button></div>}
        {candidates && current && !error && <section aria-labelledby="preparation-stats" className="rounded-xl border border-border bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="preparation-stats" className="text-sm font-semibold text-navy">Progression · {students.length} candidat{students.length > 1 ? 's' : ''}</h2>
            <button type="button" disabled={loading} className="min-h-11 rounded-lg border border-border px-3 text-sm font-medium text-navy disabled:opacity-50" onClick={refresh}>Actualiser</button>
          </div>
          <dl className="mt-2 grid grid-flow-col auto-cols-[128px] gap-2 overflow-x-auto pb-1 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-8">
            {current.stats.map(stat => {
              const colors = colorsForProgress(stat.percent);
              const labels = { identity: 'Identifiants', meeting: 'Meeting', documents: 'Documents', mousad9a: 'Mousad9a', translation: 'Traduction', test: 'Test', dv: 'DV / CIMEA', deposit: 'Dépôt' };
              return <div key={stat.key} className="min-w-0 rounded-lg border border-border border-l-[3px] px-2 py-2" style={{ backgroundColor: colors.surface, borderLeftColor: colors.accent }}>
                <dt title={stat.label} className="truncate text-xs font-medium text-navy">{labels[stat.key]}</dt>
                <dd className="mt-1">
                  <div className="flex items-baseline justify-between gap-1 tabular-nums">
                    <span className="whitespace-nowrap text-base font-semibold text-navy">{stat.done}<span className="text-xs font-normal text-slate-600"> / {stat.total}</span></span>
                    <span className="text-xs font-semibold" style={{ color: colors.accent }}>{stat.total ? stat.percent + '%' : '—'}</span>
                  </div>
                  {stat.hidden > 0 && <span title="Étapes masquées exclues du calcul" className="mt-0.5 block text-[10px] text-slate-600">{stat.hidden} masquée{stat.hidden > 1 ? 's' : ''}</span>}
                  {stat.unknown > 0 && <span className="mt-0.5 block text-[10px] text-amber-800">{stat.unknown} à vérifier</span>}
                </dd>
              </div>;
            })}
          </dl>
        </section>}
        <section aria-labelledby="student-picker" className="rounded-xl border border-border bg-surface p-5">
          <h2 id="student-picker" className="font-semibold text-navy">{student ? 'Étudiant sélectionné' : candidates ? 'Sélectionner un candidat' : 'Sélectionner un étudiant'}</h2>
          {student && <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-medium text-navy">{student.fullName}</p><p className="break-all text-sm text-text-muted">{student.email}</p></div>
            <button type="button" aria-expanded={picking} aria-controls="preparation-student-options" onClick={() => { setQuery(''); setPicking(value => !value); }} className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-navy hover:bg-canvas">
              {picking ? 'Fermer la liste' : 'Changer d’étudiant'}
            </button>
          </div>}
          {(!student || picking) && <div id="preparation-student-options">
            <label className="mt-3 block space-y-2 text-sm text-text-muted"><span>Rechercher par nom, e-mail, téléphone ou numéro de dossier</span>
              <input value={query} onChange={event => setQuery(event.target.value)} type="search" className={control} />
            </label>
            <ul aria-label={candidates ? 'Candidats filtrés' : 'Étudiants'} className="mt-3 max-h-56 divide-y divide-border overflow-y-auto">
              {matches.slice(0, 40).map(item => <li key={item.id}>
                <button type="button" aria-pressed={studentId === item.id} onClick={() => { setParams({ ...Object.fromEntries(params), studentId: item.id }); setPicking(false); setQuery(''); }}
                  className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas focus-visible:outline focus-visible:outline-2 ${studentId === item.id ? 'bg-blue-50 text-navy' : 'text-text-strong'}`}>
                  <span className="block font-medium">{item.fullName}</span><span className="block break-all text-xs text-text-muted">{item.email}</span>
                </button>
              </li>)}
            </ul>
            {!loading && !error && matches.length === 0 && <p className="mt-3 text-sm text-text-muted">Aucun dossier correspondant.</p>}
            {matches.length > 40 && <p className="mt-2 text-xs text-text-muted">Affinez la recherche pour afficher les autres dossiers.</p>}
          </div>}
        </section>
        {student ? <section aria-labelledby="preparation-student" className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="preparation-student" className="text-xl font-semibold text-navy">Préparation du dossier · {student.fullName}</h2>
          <div className="mt-5"><PreparationTimeline key={student.id + ':' + timelineRevision} prospect={student} onOpenRequired={() => setRequiredFor(student.id)} onUpdated={refresh} /></div>
        </section> : !loading && !error && <p role="status" className="text-sm text-text-muted">{studentId ? 'Ce dossier ne fait pas partie de la sélection.' : 'Sélectionnez un étudiant pour afficher sa timeline de préparation.'}</p>}
      </>}
      {requiredFor && <AdmissionRequirements key={requiredFor} studentId={requiredFor} open canWrite={canWrite} onClose={() => {
        setRequiredFor(''); setTimelineRevision(value => value + 1); refresh();
      }} />}
    </main>
  );
}
