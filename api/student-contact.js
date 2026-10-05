import { requireUser, checkOrigin, authError, sendAuthError } from './_lib/auth.js';
import { BASE_ID, TABLES, PF } from '../src/lib/config.js';

const pending = new Map();
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    checkOrigin(req, env);
    await requireUser(req, env, { allowViewContactAppend: true });
    const body = req.body || {};
    if (Object.keys(body).some(key => !['recordId', 'date', 'reason', 'expectedHistory'].includes(key))) throw authError(400, 'Only a new contact may be submitted.');
    const { recordId, date, reason, expectedHistory } = body;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (!/^rec[A-Za-z0-9]+$/.test(recordId || '') || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today) throw authError(400, 'Invalid student or contact date.');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 5000 || typeof expectedHistory !== 'string' || expectedHistory.length > 100000) throw authError(400, 'A contact reason and current history are required.');
    if (!env.AIRTABLE_API_KEY) throw authError(503, 'Airtable is not configured.');
    const request = async (method, payload) => {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.prospects}/${recordId}?returnFieldsByFieldId=true`, {
        method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
        ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw authError(response.status === 404 ? 404 : 503, 'Unable to save contact. Refresh the student before retrying.');
      return response.json();
    };
    const operation = (pending.get(recordId) || Promise.resolve()).catch(() => {}).then(async () => {
      const record = await request('GET');
      const history = record.fields?.[PF.contactHistory] || '';
      if (history !== expectedHistory) throw authError(409, 'Contact history changed. Refresh the student, then add your contact again.');
      const [year, month, day] = date.split('-');
      const line = `${day}/${month}/${year} — ${reason.replace(/\s*[\r\n]+\s*/g, ' ').trim()}`;
      const lines = [line, ...(history ? history.split('\n') : [])];
      const contactDate = line => { const match = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[—–-]/); return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : ''; };
      lines.sort((a, b) => contactDate(b).localeCompare(contactDate(a)));
      const current = record.fields?.[PF.lastContact] || '';
      const lastContact = current > date ? current : date;
      const contactHistory = lines.join('\n');
      await request('PATCH', { fields: { [PF.contactHistory]: contactHistory, [PF.lastContact]: lastContact } });
      return { lastContact, contactHistory };
    });
    pending.set(recordId, operation);
    try { res.json(await operation); } finally { if (pending.get(recordId) === operation) pending.delete(recordId); }
  } catch (error) { sendAuthError(res, error); }
}
