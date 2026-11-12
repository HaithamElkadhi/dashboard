import { BASE_ID, PF, TABLES } from '../../src/lib/config.js';
import { courseEmail, courseRecordId, maxEmailCourses, readCourse } from '../../src/lib/courses.js';
import { isMailEmail } from '../../src/lib/mailing.js';
import { authError, checkOrigin, requireUser, sendAuthError } from './auth.js';
import { sendProposalEmail } from './sendEmail.js';

const catalogUrl = 'https://student.jeexpert.com/course-finder/catalog.json';
let catalog;
let expires = 0;
let pending;

async function fetchCatalog() {
  const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw authError(503, 'Le catalogue étudiant est indisponible.');
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length || rows.some(row => !Array.isArray(row) || !courseRecordId.test(row[0]))) {
    throw authError(503, 'Le catalogue étudiant est indisponible.');
  }
  catalog = { rows, byId: new Map(rows.map(row => [row[0], row])) };
  expires = Date.now() + 5 * 60_000;
  return catalog;
}

function loadCatalog() {
  if (catalog && Date.now() < expires) return catalog;
  pending ??= fetchCatalog().finally(() => { pending = undefined; });
  return pending;
}

async function getStudent(studentId, env) {
  if (!courseRecordId.test(studentId)) throw authError(400, 'Choisissez un étudiant.');
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.prospects}/${studentId}`);
  url.searchParams.set('returnFieldsByFieldId', 'true');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) throw authError(400, 'Étudiant introuvable.');
  if (!response.ok) throw authError(503, 'Impossible de récupérer l’adresse de l’étudiant.');
  const { fields } = await response.json();
  return { name: fields[PF.fullName], email: fields[PF.email]?.trim() };
}

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Méthode non autorisée.' });
  try {
    const { user } = await requireUser(req, env);
    if (req.method === 'GET') return res.json({ courses: (await loadCatalog()).rows });
    checkOrigin(req, env);

    const { courseIds, studentId, email, requestId } = req.body ?? {};
    if (!Array.isArray(courseIds) || !courseIds.length || courseIds.length > maxEmailCourses
      || courseIds.some(id => typeof id !== 'string' || !courseRecordId.test(id))
      || new Set(courseIds).size !== courseIds.length) {
      throw authError(400, `Sélectionnez entre 1 et ${maxEmailCourses} formations.`);
    }
    if (typeof requestId !== 'string' || !/^[\da-f-]{36}$/i.test(requestId) || Boolean(studentId) === Boolean(email)) {
      throw authError(400, 'Choisissez un seul destinataire.');
    }
    const recipient = studentId ? await getStudent(studentId, env) : { email: typeof email === 'string' ? email.trim() : '' };
    if (!isMailEmail(recipient.email) || recipient.email.length > 254) throw authError(400, 'Adresse email invalide.');
    const { byId } = await loadCatalog();
    const rows = courseIds.map(id => byId.get(id));
    if (rows.some(row => !row)) throw authError(409, 'Une formation a quitté le catalogue. Actualisez la page avant de réessayer.');
    const { status, body } = await sendProposalEmail({
      toName: recipient.name || recipient.email,
      toEmail: recipient.email,
      subject: 'Votre sélection de formations en Italie | JEEXPERT',
      body: courseEmail(rows.map(readCourse), recipient.name),
    }, env, { plainText: true, idempotencyKey: `courses-${user.id}-${requestId}` });
    return res.status(status).json(body.success ? { ...body, recipient: recipient.email } : body);
  } catch (error) {
    return sendAuthError(res, error);
  }
}
