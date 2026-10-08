import { requireUser, checkOrigin, authError, sendAuthError } from './auth.js';
import { BASE_ID, TABLES, PF } from '../../src/lib/config.js';
import { INTEGRATION_TABLE as TABLE, IF as F, INTEGRATION_STEPS, HOUSING_TYPES, normalizeIntegration } from '../../src/lib/integration.js';
const pending = new Map();
let queue = Promise.resolve();
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const { user } = await requireUser(req, env);
    if (req.method === 'POST') checkOrigin(req, env);
    const studentId = req.method === 'GET' ? new URL(req.url, 'http://internal').searchParams.get('studentId') : req.body?.studentId;
    if (!/^rec[A-Za-z0-9]+$/.test(studentId || '')) throw authError(400, 'Select a valid student.');
    const request = (path, method = 'GET', fields) => {
      const operation = queue.then(async () => {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, ...(fields ? { body: JSON.stringify({ fields, returnFieldsByFieldId: true }) } : {}), signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw authError(response.status === 404 ? 404 : 503, method === 'GET' ? 'Unable to load student integration.' : 'Save could not be confirmed. Refresh before retrying.');
        return response.json();
      });
      queue = operation.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 225)));
      return operation;
    };
    const student = await request(`${TABLES.prospects}/${studentId}?returnFieldsByFieldId=true`);
    const read = async () => {
      const params = new URLSearchParams({ returnFieldsByFieldId: 'true', filterByFormula: `{${F.studentId}}='${studentId}'`, pageSize: '100' });
      const records = []; let offset;
      do { if (offset) params.set('offset', offset); const page = await request(`${TABLE}?${params}`); records.push(...(page.records || [])); offset = page.offset; } while (offset);
      if (records.some(record => !record.fields?.[F.student]?.includes(studentId))) throw authError(409, 'Integration student links are inconsistent. Correct them in Airtable.');
      if (INTEGRATION_STEPS.some(step => records.filter(record => record.fields?.[F.step] === step.name).length > 1)) throw authError(409, 'Duplicate integration steps found. Correct them in Airtable before saving.');
      return INTEGRATION_STEPS.map(step => normalizeIntegration(records.find(record => record.fields?.[F.step] === step.name), step.name));
    };
    if (req.method === 'GET') return res.json({ student: { id: student.id, fullName: student.fields?.[PF.fullName] || '', email: student.fields?.[PF.email] || '' }, steps: await read() });
    const { step, input, expected } = req.body || {};
    const definition = INTEGRATION_STEPS.find(item => item.name === step);
    if (Object.keys(req.body).some(key => !['studentId', 'step', 'input', 'expected'].includes(key)) || !definition || !input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !definition.fields.includes(key)) || !expected || typeof expected !== 'object') throw authError(400, 'Invalid integration step.');
    const clean = {};
    for (const key of definition.fields) {
      const value = input[key] ?? '';
      if (typeof value !== 'string' || value.length > (key === 'notes' ? 5000 : 2000)) throw authError(400, 'Invalid integration information.');
      clean[key] = value.trim();
    }
    if (definition.statuses.length && !definition.statuses.includes(clean.status)) throw authError(400, 'Select a valid status.');
    if (clean.housingType && !HOUSING_TYPES.includes(clean.housingType)) throw authError(400, 'Select a valid housing type.');
    for (const key of ['completedDate']) if (clean[key] && !validDate(clean[key])) throw authError(400, 'Invalid date.');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (definition.fields.includes('completedDate')) {
      const needsDate = step === 'Welcome package' ? clean.status === 'Sent' : ['Link sent', 'Completed'].includes(clean.status);
      if (needsDate) { clean.completedDate ||= today; if (clean.completedDate > today) throw authError(400, 'Sent date cannot be in the future.'); }
      else clean.completedDate = '';
    }
    if (clean.link) {
      let url; try { url = new URL(clean.link); } catch { throw authError(400, 'Invalid useful link.'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw authError(400, 'Use an HTTP or HTTPS link without embedded credentials.');
    }
    const operation = (pending.get(studentId) || Promise.resolve()).catch(() => {}).then(async () => {
      const current = (await read()).find(item => item.step === step);
      if (Object.keys(current).some(key => current[key] !== expected[key])) throw authError(409, 'This step changed. Refresh before saving.');
      const changed = definition.fields.filter(key => current[key] !== clean[key]);
      if (!changed.length) return current;
      const actor = `${user.displayName || user.username} (${user.username})`, now = new Date().toISOString();
      const line = `${now} — ${actor} — ${changed.map(key => `${key}: ${current[key] || '—'} → ${clean[key] || '—'}`).join('; ')}`;
      const history = [current.history, line].filter(Boolean).join('\n');
      if (history.length > 95000) throw authError(409, 'History is full. Archive it in Airtable before updating this step.');
      const fields = { ...Object.fromEntries(definition.fields.map(key => [F[key], clean[key] || null])), [F.updatedBy]: actor, [F.updatedAt]: now, [F.history]: history };
      if (!current.id) Object.assign(fields, { [F.name]: `${student.fields?.[PF.fullName] || studentId} — ${step}`, [F.student]: [studentId], [F.studentId]: studentId, [F.step]: step });
      const saved = await request(current.id ? `${TABLE}/${current.id}` : TABLE, current.id ? 'PATCH' : 'POST', fields);
      return normalizeIntegration(saved, step);
    });
    pending.set(studentId, operation);
    try { res.json({ step: await operation }); } finally { if (pending.get(studentId) === operation) pending.delete(studentId); }
  } catch (error) { sendAuthError(res, error); }
}
