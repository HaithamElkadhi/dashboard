import { requireUser, checkOrigin, authError, sendAuthError } from './auth.js';
import { BASE_ID, TABLES, PF } from '../../src/lib/config.js';
import { ADMISSION_DOCUMENTS, REQUESTED_DOCUMENTS_FIELD as F, mergeRequestedDocuments } from '../../src/lib/admissionDocuments.js';
const pending = new Map();
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    await requireUser(req, env);
    if (req.method === 'POST') checkOrigin(req, env);
    const studentId = req.method === 'GET' ? new URL(req.url, 'http://internal').searchParams.get('studentId') : req.body?.studentId;
    if (!/^rec[A-Za-z0-9]+$/.test(studentId || '')) throw authError(400, 'Select a valid prospect.');
    const request = async (method = 'GET', fields) => {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.prospects}/${studentId}?returnFieldsByFieldId=true`, {
        method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
        ...(fields ? { body: JSON.stringify({ fields, returnFieldsByFieldId: true }) } : {}), signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw authError(response.status === 404 ? 404 : 503, method === 'GET' ? 'Unable to load requested documents.' : 'Update could not be confirmed. Refresh before trying again.');
      return response.json();
    };
    const result = record => ({ student: { id: record.id, fullName: record.fields?.[PF.fullName] || '', email: record.fields?.[PF.email] || '' }, requested: record.fields?.[F] || '' });
    if (req.method === 'GET') return res.json(result(await request()));
    const { documentIds, expected } = req.body || {};
    const allowed = new Set(ADMISSION_DOCUMENTS.map(doc => doc.id));
    if (Object.keys(req.body).some(key => !['studentId', 'documentIds', 'expected'].includes(key)) || !Array.isArray(documentIds) || !documentIds.length || documentIds.length > ADMISSION_DOCUMENTS.length || documentIds.some(id => !allowed.has(id)) || typeof expected !== 'string') throw authError(400, 'Select valid admission documents.');
    const operation = (pending.get(studentId) || Promise.resolve()).catch(() => {}).then(async () => {
      const current = await request();
      if ((current.fields?.[F] || '') !== expected) throw authError(409, 'Requested documents changed. Refresh before adding documents.');
      const names = ADMISSION_DOCUMENTS.filter(doc => documentIds.includes(doc.id)).map(doc => doc.name);
      const requested = mergeRequestedDocuments(expected, names);
      if (requested === expected) return result(current);
      return result(await request('PATCH', { [F]: requested }));
    });
    pending.set(studentId, operation);
    try { res.json(await operation); } finally { if (pending.get(studentId) === operation) pending.delete(studentId); }
  } catch (error) { sendAuthError(res, error); }
}
