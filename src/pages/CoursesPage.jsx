import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StudentPicker from '../components/documents/StudentPicker.jsx';
import { ArrowLeftIcon, BookOpenIcon, MailIcon, SearchIcon, StarIcon } from '../components/icons.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { fetchProspectsForSearch } from '../lib/airtable.js';
import { courseEmail, courseLabel, courseRecordId, maxEmailCourses, readCourse } from '../lib/courses.js';
import { isMailEmail } from '../lib/mailing.js';
import { universitySearchKey } from '../lib/universities.js';

const control = 'rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50';
const pageSize = 24;
const filterFields = [['university', 'Établissement'], ['degree', 'Diplôme'], ['language', 'Langue'], ['status', 'Statut']];
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const viewLink = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy';

async function coursesRequest(options) {
  const response = await fetch('/api/courses', options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Le service Courses est indisponible.');
  return data;
}

function ShortlistEmail({ courses, attempt, onClose, onSent }) {
  const dialog = useRef(null);
  const inFlight = useRef(false);
  const [mode, setMode] = useState('student');
  const [students, setStudents] = useState(null);
  const [studentsError, setStudentsError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const student = students?.find(person => person.id === studentId);

  useEffect(() => {
    const panel = dialog.current;
    panel.showModal();
    return () => { if (panel.open) panel.close(); };
  }, []);

  useEffect(() => {
    let active = true;
    fetchProspectsForSearch()
      .then(records => { if (active) setStudents(records.filter(person => isMailEmail(person.email?.trim())).sort((a, b) => collator.compare(a.fullName, b.fullName))); })
      .catch(() => { if (active) setStudentsError('Impossible de charger les étudiants.'); });
    return () => { active = false; };
  }, []);

  const close = () => {
    if (inFlight.current) return;
    dialog.current.close();
    onClose();
  };

  async function send(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const recipient = mode === 'student' ? { studentId } : { email: email.trim() };
    const payload = { ...recipient, courseIds: courses.map(course => course.id) };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    inFlight.current = true;
    setSending(true);
    setError('');
    try {
      const result = await coursesRequest({
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: attempt.current.id }),
      });
      attempt.current = null;
      inFlight.current = false;
      close();
      onSent(result.recipient);
    } catch (err) {
      setError(err.message);
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="courses-email-title" onCancel={event => { event.preventDefault(); close(); }}
      className="m-auto max-h-[90dvh] w-[min(94vw,38rem)] overflow-y-auto rounded-xl border border-border bg-white p-5 text-text-strong shadow-xl backdrop:bg-navy/40 sm:p-6">
      <form className="space-y-4" onSubmit={send}>
        <div>
          <h2 id="courses-email-title" className="text-lg font-semibold text-navy">Envoyer la sélection</h2>
          <p className="mt-1 text-sm text-text-muted">{courses.length} formation{courses.length > 1 ? 's' : ''}</p>
        </div>
        <fieldset disabled={sending} className="flex flex-wrap gap-4 text-sm">
          <legend className="mb-2 font-medium text-navy">Destinataire</legend>
          <label className="flex items-center gap-2"><input type="radio" name="recipient" checked={mode === 'student'} onChange={() => setMode('student')} /> Étudiant</label>
          <label className="flex items-center gap-2"><input type="radio" name="recipient" checked={mode === 'email'} onChange={() => setMode('email')} /> Adresse email</label>
        </fieldset>
        {mode === 'student' ? (
          <div>
            <StudentPicker students={students ?? []} value={studentId} onChange={setStudentId} disabled={sending || !students} />
            {!students && <p role="status" className="mt-1 text-sm text-text-muted">{studentsError || 'Chargement des étudiants…'}</p>}
          </div>
        ) : (
          <label className="block text-sm font-medium text-navy">
            Adresse email
            <input className={`${control} mt-1 block w-full`} type="email" required maxLength={254} value={email} disabled={sending} onChange={event => setEmail(event.target.value)} />
          </label>
        )}
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-navy">Aperçu du message</h3>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-canvas p-3 font-sans text-sm">{courseEmail(courses, mode === 'student' ? student?.fullName : '')}</pre>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button className={control} type="button" onClick={close} disabled={sending}>Annuler</button>
          <button className={primary} disabled={sending || !(mode === 'student' ? student : isMailEmail(email.trim()))}>
            {sending ? 'Envoi…' : 'Envoyer par email'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function CourseCard({ course, saved, onToggle }) {
  const metadata = [courseLabel(course.degree), courseLabel(course.language)].filter(Boolean);
  const details = [
    ['Nom italien', course.italian !== course.title && course.italian], ['Année universitaire', course.year],
    ['Durée (ans)', course.duration], ['Crédits (CFU)', course.credits], ['Code de formation', course.code],
    ['Type d’admission', course.admission], ['Modalités d’admission', course.method],
    ['Modalités d’enseignement', course.teaching || course.delivery], ['Statut', course.status],
    ['Frais de candidature', course.fee], ['Date limite', course.deadline],
  ].filter(([, value]) => value != null && value !== '' && value !== false);
  return (
    <article className={`flex min-w-0 flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${saved ? 'border-amber-200' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {!!metadata.length && <div className="mb-3 flex flex-wrap gap-1.5">
            {metadata.map(value => <span key={value} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-navy">{value}</span>)}
          </div>}
          <h2 className="break-words text-base font-semibold leading-snug text-navy">{course.title}</h2>
          {course.university && <p className="mt-1 break-words text-sm text-text-muted">{course.university}</p>}
          {course.campus && <p className="mt-1 break-words text-xs text-text-muted">{course.campus}</p>}
        </div>
        <button type="button" aria-pressed={saved} aria-label={`Favori · ${course.title}`} title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`${control} grid h-10 w-10 shrink-0 place-items-center p-0 ${saved ? 'border-amber-200 bg-amber-50 text-amber-800' : 'hover:border-navy hover:bg-canvas'}`} onClick={onToggle}>
          <StarIcon size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <details className="mt-auto border-t border-border pt-3 text-sm">
        <summary className="cursor-pointer rounded font-medium text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy">Voir la formation</summary>
        <dl className="mt-2 space-y-2">
          {details.map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="break-words">{value}</dd></div>)}
        </dl>
        {course.url && <a className="mt-2 inline-block font-medium text-navy underline" href={course.url} target="_blank" rel="noreferrer">Site de la formation</a>}
      </details>
    </article>
  );
}

function CourseCatalog({ storageKey, canWrite }) {
  const sendAttempt = useRef(null);
  const [searchParams] = useSearchParams();
  const favoritesOnly = searchParams.get('view') === 'favorites';
  const [courses, setCourses] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [composer, setComposer] = useState(false);
  const [notice, setNotice] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem(storageKey));
      return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && courseRecordId.test(id)) : []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    const request = new AbortController();
    coursesRequest({ signal: request.signal })
      .then(data => {
        if (request.signal.aborted) return;
        const entries = data.courses.map(readCourse).map(course => ({
          ...course,
          searchable: universitySearchKey([course.title, course.italian, course.university, course.campus, course.code].join(' ')),
        }));
        setCourses(entries.sort((a, b) => collator.compare(a.title, b.title)));
      })
      .catch(err => { if (!request.signal.aborted) setLoadError(err.message); });
    return () => request.abort();
  }, [reload]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); }
    catch { /* The selection remains available in memory. */ }
  }, [favorites, storageKey]);

  const filterOptions = useMemo(() => Object.fromEntries(filterFields.map(([key]) => [
    key, [...new Set((courses ?? []).map(course => course[key]).filter(Boolean))]
      .sort((a, b) => collator.compare(courseLabel(a), courseLabel(b))),
  ])), [courses]);
  const shortlist = useMemo(() => (courses ?? []).filter(course => favorites.has(course.id)), [courses, favorites]);
  const results = useMemo(() => {
    if (favoritesOnly) return shortlist;
    const words = universitySearchKey(query).split(/\s+/);
    return (courses ?? []).filter(course =>
      words.every(word => course.searchable.includes(word)) && filterFields.every(([key]) => !filters[key] || course[key] === filters[key]));
  }, [courses, favoritesOnly, shortlist, filters, query]);
  const lastPage = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(favoritesOnly ? favoritesPage : page, lastPage);
  const changePage = favoritesOnly ? setFavoritesPage : setPage;
  const hasFilters = Boolean(query.trim() || Object.values(filters).some(Boolean));
  const resetFilters = () => { setQuery(''); setFilters({}); setPage(1); };

  function toggleFavorite(id) {
    setFavorites(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-8">
      <nav aria-label="Navigation des formations" className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-xl border border-border bg-white p-2 shadow-sm">
        <Link to="/courses" aria-current={favoritesOnly ? undefined : 'page'}
          className={`${viewLink} ${favoritesOnly ? 'text-navy hover:bg-canvas' : 'bg-navy text-white'}`}>
          <BookOpenIcon size={17} /> Catalogue
        </Link>
        <Link to="/courses?view=favorites" aria-current={favoritesOnly ? 'page' : undefined}
          className={`${viewLink} ${favoritesOnly ? 'bg-navy text-white' : 'text-navy hover:bg-canvas'}`}>
          <StarIcon size={17} /> Favoris
          <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${favoritesOnly ? 'bg-white text-navy' : 'bg-sky-100 text-navy'}`}>{shortlist.length}</span>
        </Link>
      </nav>
      {favoritesOnly ? (
        <section aria-labelledby="shortlist-title" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-4 sm:p-5">
          <div>
            <Link to="/courses" className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy">
              <ArrowLeftIcon size={16} /> Retour au catalogue
            </Link>
            <h2 id="shortlist-title" className="mt-2 text-xl font-semibold text-navy">Ma sélection</h2>
          </div>
          {canWrite && shortlist.length > 0 && (
            <button type="button" className={primary} aria-haspopup="dialog" disabled={shortlist.length > maxEmailCourses}
              onClick={() => { setNotice(''); setComposer(true); }}>
              <MailIcon size={17} /> Envoyer la sélection
            </button>
          )}
          {canWrite && shortlist.length > maxEmailCourses && <p className="w-full text-sm text-amber-800">Gardez au maximum {maxEmailCourses} favoris pour les envoyer par email.</p>}
        </section>
      ) : (
      <section aria-label="Recherche et filtres" className="space-y-4 rounded-xl border border-border bg-white p-4 sm:p-5">
        <label className="block text-sm font-medium text-navy">
          Rechercher une formation
          <span className="relative mt-1.5 block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted" aria-hidden="true"><SearchIcon size={17} /></span>
            <input className={`${control} block min-h-11 w-full pl-10`} type="search" placeholder="Nom, université ou code" value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }} />
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filterFields.map(([key, label]) => (
            <label key={key} className="min-w-0 text-sm font-medium text-navy">
              {label}
              <select className={`${control} mt-1 block w-full`} value={filters[key] ?? ''}
                onChange={event => { setFilters({ ...filters, [key]: event.target.value }); setPage(1); }}>
                <option value="">Tous</option>
                {filterOptions[key].map(option => <option key={option} value={option}>{courseLabel(option)}</option>)}
              </select>
            </label>
          ))}
        </div>
        {hasFilters && <button type="button" className="rounded text-sm font-medium text-navy underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy" onClick={resetFilters}>Réinitialiser les filtres</button>}
      </section>
      )}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {loadError ? (
        <div role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          {loadError}{' '}
          <button className="font-medium underline" onClick={() => { setLoadError(''); setReload(value => value + 1); }}>Réessayer</button>
        </div>
      ) : !courses ? <p role="status" className="text-sm text-text-muted">Chargement du catalogue…</p> : (
        <>
          <p role="status" className="text-sm font-medium text-navy">{results.length.toLocaleString('fr-FR')} formation{results.length !== 1 ? 's' : ''}</p>
          {results.length === 0 && (
            <div className="space-y-3 rounded-xl border border-dashed border-border bg-white p-6 text-center sm:p-10">
              {favoritesOnly ? (
                <>
                  <StarIcon size={24} className="mx-auto text-navy" />
                  <h3 className="font-semibold text-navy">Aucun favori</h3>
                  <p className="text-sm text-text-muted">Cliquez sur l’étoile d’une formation pour l’ajouter à votre sélection.</p>
                  <Link className={primary} to="/courses">Parcourir le catalogue</Link>
                </>
              ) : <p className="text-sm text-text-muted">Aucune formation ne correspond à votre recherche.</p>}
            </div>
          )}
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(course => (
              <CourseCard key={course.id} course={course} saved={favorites.has(course.id)} onToggle={() => toggleFavorite(course.id)} />
            ))}
          </div>
          {lastPage > 1 && (
            <nav aria-label="Pages du catalogue" className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={control} disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Précédente</button>
              <span className="text-sm text-text-muted">Page {currentPage} sur {lastPage}</span>
              <button type="button" className={control} disabled={currentPage === lastPage} onClick={() => changePage(currentPage + 1)}>Suivante</button>
            </nav>
          )}
        </>
      )}
      {composer && canWrite && <ShortlistEmail courses={shortlist} attempt={sendAttempt} onClose={() => setComposer(false)} onSent={email => setNotice(`Sélection envoyée à ${email}.`)} />}
    </div>
  );
}

export default function CoursesPage() {
  const { user, canWrite } = useAuth();
  return <CourseCatalog key={user.id} storageKey={`jeexpert-courses:${user.id}`} canWrite={canWrite} />;
}
