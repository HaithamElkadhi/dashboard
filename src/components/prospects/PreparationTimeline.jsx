import PreparationMeeting from './PreparationMeeting.jsx';
import PreparationDeposit from './PreparationDeposit.jsx';
import PreparationDv from './PreparationDv.jsx';
import PreparationTest from './PreparationTest.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { fetchCandidatureEmail } from '../../lib/airtable.js';

const steps = [
  { title: 'Identifiants', description: 'Vérifier les comptes et les accès créés pour le candidat.' },
  { title: 'Preparation meeting', description: 'Faire le point sur la préparation du dossier avec le candidat.' },
  { title: 'Liste des documents', description: 'Consulter les pièces demandées et celles qui restent à fournir.' },
  { title: 'Mousad9a', description: 'Vérifier quels diplômes et relevés doivent être authentifiés.' },
  { title: 'Traduction', description: 'Confirmer les pièces à traduire et la langue attendue avant de contacter un traducteur assermenté.' },
  { title: 'IELTS, CISIA ou équivalent', description: 'Vérifier le justificatif de langue ou le test d’admission exigé par la formation.' },
  { title: 'Déclaration de valeur ou CIMEA', description: 'Confirmer auprès de l’établissement le justificatif de diplôme accepté.' },
  { title: 'Dépôt du dossier', description: 'Déposer les fichiers dans le portail étudiant ou prendre rendez-vous pour apporter le dossier au bureau.' },
];

export default function PreparationTimeline({ prospect, onOpenRequired, onUpdated }) {
  const { canWrite } = useAuth();
  const [translation, setTranslation] = useState(null);
  const [translationError, setTranslationError] = useState('');
  const [savingTranslation, setSavingTranslation] = useState(false);
  const [mousad9a, setMousad9a] = useState(null);
  const [mousad9aError, setMousad9aError] = useState('');
  const [savingMousad9a, setSavingMousad9a] = useState(false);
  const [mousad9aRevision, setMousad9aRevision] = useState(0);
  const [identity, setIdentity] = useState(null);
  const [identityError, setIdentityError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [checklist, setChecklist] = useState(null);
  const [checklistError, setChecklistError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setChecklist(null);
    setChecklistError(false);
    async function loadChecklist() {
      try {
        const response = await fetch('/api/admission-documents?' + new URLSearchParams({ studentId: prospect.id, checklist: '1' }), { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Checklist unavailable');
        const result = await response.json();
        if (!controller.signal.aborted) setChecklist({ id: prospect.id, configured: result.configured === true, count: Array.isArray(result.documents) ? result.documents.length : 0 });
      } catch {
        if (!controller.signal.aborted) setChecklistError(true);
      }
    }
    void loadChecklist();
    return () => controller.abort();
  }, [prospect.id, revision]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    setIdentity(null);
    setIdentityError(false);
    fetchCandidatureEmail(prospect.id)
      .then(email => {
        if (active) setIdentity({ id: prospect.id, email });
      })
      .catch(() => { if (active) setIdentityError(true); });
    return () => { active = false; };
  }, [prospect.id, revision]);
  useEffect(() => {
    const controller = new AbortController();
    setMousad9a(null);
    setTranslation(null);
    setTranslationError('');
    setMousad9aError('');
    fetch('/api/admission-documents?' + new URLSearchParams({ studentId: prospect.id, preparation: '1' }), { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Vérification indisponible.');
        if (!controller.signal.aborted) {
          setMousad9a({ id: prospect.id, done: result.mousad9aDone === true });
          setTranslation({ id: prospect.id, done: result.translationDone === true });
        }
      })
      .catch(error => { if (!controller.signal.aborted) { setMousad9aError(error.message); setTranslationError(error.message); } });
    return () => controller.abort();
  }, [prospect.id, mousad9aRevision]);

  async function toggleMousad9a() {
    if (!canWrite || savingMousad9a || mousad9a?.id !== prospect.id) return;
    setSavingMousad9a(true);
    setMousad9aError('');
    try {
      const response = await fetch('/api/admission-documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-mousad9a', studentId: prospect.id, done: !mousad9a.done, expected: mousad9a.done }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Enregistrement non confirmé.');
      setMousad9a({ id: prospect.id, done: result.mousad9aDone === true });
      onUpdated?.();
    } catch (error) { setMousad9aError(error.message); }
    finally { setSavingMousad9a(false); }
  }
  async function toggleTranslation() {
    if (!canWrite || savingTranslation || translation?.id !== prospect.id) return;
    setSavingTranslation(true);
    setTranslationError('');
    try {
      const response = await fetch('/api/admission-documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-translation', studentId: prospect.id, done: !translation.done, expected: translation.done }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Enregistrement non confirmé.');
      setTranslation({ id: prospect.id, done: result.translationDone === true });
      onUpdated?.();
    } catch (error) { setTranslationError(error.message); }
    finally { setSavingTranslation(false); }
  }
  const translationDone = translation?.id === prospect.id && translation.done;
  const mousad9aDone = mousad9a?.id === prospect.id && mousad9a.done;
  const applicationEmail = identity?.id === prospect.id ? identity.email : '';
  const documentsConfigured = checklist?.id === prospect.id && checklist.configured && checklist.count > 0;
  return (
      <ol className="space-y-3">
        {steps.map(({ title, description }, index) => index === 1 ? (
          <li key={title}><PreparationMeeting key={prospect.id} studentId={prospect.id} onUpdated={onUpdated} /></li>
        ) : index === 5 ? (
          <li key={title}><PreparationTest key={prospect.id} studentId={prospect.id} onUpdated={onUpdated} /></li>
        ) : index === 6 ? (
          <li key={title}><PreparationDv key={prospect.id} studentId={prospect.id} onUpdated={onUpdated} /></li>
        ) : index === 7 ? (
          <li key={title}><PreparationDeposit key={prospect.id} studentId={prospect.id} onUpdated={onUpdated} /></li>
        ) : (
          <li
            key={title}
            className="relative flex items-start gap-3 before:absolute before:bottom-[-12px] before:left-[15px] before:top-4 before:w-0.5 before:bg-[#80C4EA] last:before:hidden"
          >
            <span aria-hidden="true" className={`relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${(index === 0 && applicationEmail || index === 2 && documentsConfigured || index === 3 && mousad9aDone || index === 4 && translationDone) ? "bg-emerald-600 text-white" : "bg-[#E8F4FB] text-sm text-[#173B65]"}`}>
              {index}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border p-3">
              <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
              <p className="mt-1 text-sm text-text-muted">{description}</p>
              {index === 0 && (
                applicationEmail ? <p className="mt-2 break-all text-sm font-medium text-emerald-800">E-mail de candidature renseigné · {applicationEmail}</p>
                  : identityError ? <p role="alert" className="mt-2 text-sm text-red-700">Vérification indisponible. <button type="button" className="min-h-11 rounded underline" onClick={() => setRevision(value => value + 1)}>Réessayer</button></p>
                  : identity?.id === prospect.id ? <p className="mt-2 text-sm text-text-muted">E-mail de candidature à renseigner.</p>
                  : <p role="status" className="mt-2 text-sm text-text-muted">Vérification de l’e-mail de candidature…</p>
              )}

              {index === 2 && (
                documentsConfigured ? <p className="mt-2 text-sm font-medium text-emerald-800">Liste des documents renseignée · {checklist.count} pièces</p>
                  : checklistError ? <p role="alert" className="mt-2 text-sm text-red-700">Vérification indisponible. <button type="button" className="min-h-11 rounded underline" onClick={() => setRevision(value => value + 1)}>Réessayer</button></p>
                  : checklist?.id === prospect.id ? <p className="mt-2 text-sm text-text-muted">Liste des documents à renseigner dans « Required document ».</p>
                  : <p role="status" className="mt-2 text-sm text-text-muted">Vérification de la liste des documents…</p>
              )}
              {index === 3 && (
                <div className="mt-2">
                  <p className={mousad9aDone ? 'text-sm font-medium text-emerald-800' : 'text-sm text-text-muted'}>
                    {mousad9a?.id === prospect.id ? mousad9aDone ? 'Fait' : 'Non fait' : 'Vérification du statut…'}
                  </p>
                  {canWrite && <button type="button" disabled={savingMousad9a || mousad9a?.id !== prospect.id} onClick={toggleMousad9a}
                    className="mt-2 min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50">
                    {savingMousad9a ? 'Enregistrement…' : mousad9aDone ? 'Marquer non fait' : 'Marquer fait'}
                  </button>}
                  {mousad9aError && <div className="mt-2 text-sm text-red-700"><p role="alert">{mousad9aError}</p><button type="button" disabled={savingMousad9a} className="min-h-11 rounded underline" onClick={() => setMousad9aRevision(value => value + 1)}>Actualiser le statut</button></div>}
                </div>
              )}
              {index === 4 && (
                <div className="mt-2">
                  <p className={translationDone ? 'text-sm font-medium text-emerald-800' : 'text-sm text-text-muted'}>
                    {translation?.id === prospect.id ? translationDone ? 'Fait' : 'Non fait' : 'Vérification du statut…'}
                  </p>
                  {canWrite && <button type="button" disabled={savingTranslation || translation?.id !== prospect.id} onClick={toggleTranslation}
                    className="mt-2 min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50">
                    {savingTranslation ? 'Enregistrement…' : translationDone ? 'Marquer non fait' : 'Marquer fait'}
                  </button>}
                  {translationError && <div className="mt-2 text-sm text-red-700"><p role="alert">{translationError}</p><button type="button" disabled={savingTranslation} className="min-h-11 rounded underline" onClick={() => setMousad9aRevision(value => value + 1)}>Actualiser le statut</button></div>}
                </div>
              )}
              {title === 'Liste des documents' && (
                <button
                  type="button"
                  onClick={onOpenRequired}
                  className="inline-flex min-h-11 items-center rounded text-sm font-medium text-[#173B65] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Ouvrir les documents du candidat
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
  );
}
