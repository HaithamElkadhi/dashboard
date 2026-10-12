import { requireUser, checkOrigin, authError, sendAuthError } from './auth.js';
import { PROSPECTION_BASE, LEADS_TABLE, CALLS_TABLE, INTERESTS, normalizeLead, leadError, leadFields } from '../../src/lib/prospection.js';

const recordId = value => /^rec[A-Za-z0-9]+$/.test(value || '');
const operationKey = value => /^[a-zA-Z0-9-]{8,100}$/.test(value || '');
let queue = Promise.resolve();
function queued(work) {
  const result = queue.then(work);
  queue = result.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 225)));
  return result;
}
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const { user } = await requireUser(req, env);
    if (req.method === 'POST') checkOrigin(req, env);
    const token = env.AIRTABLE_PROSPECTION_TOKEN || env.AIRTABLE_API_KEY;
    if (!token) throw authError(503, 'Connexion Airtable non configurée.');
    const request = (path, method = 'GET', body) => queued(async () => {
      const response = await fetch(`https://api.airtable.com/v0/${PROSPECTION_BASE}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw authError(response.status === 404 ? 404 : 503, response.status === 403 ? 'Le token Airtable doit avoir accès à la base Prospection.' : 'Airtable indisponible. Actualisez avant de réessayer.');
      return response.json();
    });
    const list = async (table, params = {}) => {
      const records = []; let offset;
      do {
        const query = new URLSearchParams({ pageSize: '100', ...params });
        if (offset) query.set('offset', offset);
        const page = await request(`${table}?${query}`);
        records.push(...page.records); offset = page.offset;
      } while (offset);
      return records;
    };
    const senders = { default: env.RESEND_FROM, contact: env.RESEND_FROM_CONTACT, ecole: env.RESEND_FROM_CONTACT_Ecole || 'Ecole <maitre@jeexpert-study.com>' };
    if (req.method === 'GET') {
      if (new URL(req.url, 'http://internal').searchParams.has('senders')) return res.json({ senders: Object.entries(senders).filter(([, address]) => address).map(([key, address]) => ({ key, address })) });
      const leadId = new URL(req.url, 'http://internal').searchParams.get('leadId');
      if (!leadId) return res.json({ leads: (await list(LEADS_TABLE)).map(normalizeLead) });
      if (!recordId(leadId)) throw authError(400, 'Lead invalide.');
      const lead = normalizeLead(await request(`${LEADS_TABLE}/${leadId}`));
      const escape = value => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const linked = `{Lead ID}='${leadId}'`;
      const legacy = lead.phone && lead.name ? `AND({Lead ID}=BLANK(),{Phone number}='${escape(lead.phone)}',{Full Name}='${escape(lead.name)}')` : '';
      const calls = await list(CALLS_TABLE, { filterByFormula: legacy ? `OR(${linked},${legacy})` : linked });
      return res.json({ calls: calls.map(record => ({ id: record.id, date: record.fields['Date et Heure'], channel: record.fields['Canal of Call'], interest: record.fields['Intérêt'] || record.fields.State || '', comment: record.fields.Comment || '', author: record.fields['Called By'] || '' })).sort((a, b) => (b.date || '').localeCompare(a.date || '')) });
    }
    const body = req.body || {};
    if (body.action === 'email') {
      if (!recordId(body.id) || !operationKey(body.key) || typeof body.subject !== 'string' || !body.subject.trim() || body.subject.length > 200 || /[\r\n]/.test(body.subject) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 20000) throw authError(400, 'Email invalide.');
      const from = Object.hasOwn(senders, body.fromKey) && senders[body.fromKey];
      if (!from) throw authError(400, 'Choisissez un expéditeur configuré.');
      if (!env.RESEND_API_KEY) throw authError(503, 'Envoi email non configuré.');
      const lead = normalizeLead(await request(`${LEADS_TABLE}/${body.id}`));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) throw authError(400, 'Adresse email du lead manquante ou invalide.');
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `prospection-${user.id}-${body.key}` }, body: JSON.stringify({ from, to: [lead.email], subject: body.subject.trim(), text: body.message.trim() }), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw authError(503, 'Envoi non confirmé. Réessayez avec le même message.');
      return res.json({ success: true });
    }
    if (body.action === 'save') {
      const error = leadError(body.input);
      if (error) throw authError(400, error);
      if (body.id && !recordId(body.id)) throw authError(400, 'Lead invalide.');
      const record = await request(`${LEADS_TABLE}${body.id ? '/' + body.id : ''}`, body.id ? 'PATCH' : 'POST', { fields: leadFields(body.input) });
      return res.json({ lead: normalizeLead(record) });
    }
    if (body.action === 'import') {
      if (!operationKey(body.importId) || !Array.isArray(body.rows) || !body.rows.length || body.rows.length > 10) throw authError(400, 'Import invalide : 10 lignes maximum par lot.');
      const seen = new Set();
      const records = body.rows.map(row => {
        if (!Number.isInteger(row.index) || row.index < 0 || row.index > 5000 || seen.has(row.index)) throw authError(400, 'Ligne d’import invalide.');
        seen.add(row.index);
        const error = leadError(row.input);
        if (error) throw authError(400, `Ligne ${row.index + 2} : ${error}`);
        return { fields: { ...leadFields(row.input), 'Import Key': `${user.id}:${body.importId}:${row.index}` } };
      });
      const result = await request(LEADS_TABLE, 'PATCH', { performUpsert: { fieldsToMergeOn: ['Import Key'] }, records });
      return res.json({ leads: result.records.map(normalizeLead) });
    }
    if (body.action === 'interest') {
      if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 10 || body.ids.some(id => !recordId(id)) || new Set(body.ids).size !== body.ids.length || !INTERESTS.includes(body.interest)) throw authError(400, 'Sélection ou intérêt invalide (10 leads maximum par lot).');
      const result = await request(LEADS_TABLE, 'PATCH', { records: body.ids.map(id => ({ id, fields: { 'Intérêt': body.interest } })) });
      return res.json({ leads: result.records.map(normalizeLead) });
    }
    if (!recordId(body.id)) throw authError(400, 'Lead invalide.');
    if (body.action === 'delete') {
      await request(`${LEADS_TABLE}/${body.id}`, 'DELETE');
      return res.json({ deleted: body.id });
    }
    if (body.action === 'call') {
      if (!operationKey(body.key) || !INTERESTS.includes(body.interest) || !['Phone', 'WhatsApp'].includes(body.channel) || typeof body.comment !== 'string' || body.comment.length > 5000 || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(body.date) || !Number.isFinite(Date.parse(body.date)) || Date.parse(body.date) > Date.now() + 60000) throw authError(400, 'Appel invalide.');
      const lead = normalizeLead(await request(`${LEADS_TABLE}/${body.id}`));
      const key = `${user.id}:${body.key}`;
      const existing = await list(CALLS_TABLE, { filterByFormula: `{Activity Key}='${key}'` });
      let call = existing[0];
      if (call && call.fields['Lead ID'] !== body.id) throw authError(409, 'Identifiant d’activité déjà utilisé.');
      if (!call) {
        const result = await request(CALLS_TABLE, 'PATCH', { performUpsert: { fieldsToMergeOn: ['Activity Key'] }, records: [{ fields: { 'Full Name': lead.name, 'Lead ID': lead.id, 'Date et Heure': new Date(body.date).toISOString(), 'Canal of Call': body.channel, State: 'Done', Comment: body.comment.trim(), 'Called By': `${user.displayName} (${user.username})`, 'Phone number': lead.phone, 'Intérêt': body.interest, 'Activity Key': key } }] });
        call = result.records[0];
      }
      const date = call.fields['Date et Heure'];
      if (!lead.lastCall || date >= lead.lastCall) {
        try {
          const updated = await request(`${LEADS_TABLE}/${lead.id}`, 'PATCH', { fields: { 'Last Contacted': date, 'Intérêt': call.fields['Intérêt'] } });
          return res.json({ lead: normalizeLead(updated) });
        } catch {
          return res.json({ lead, warning: 'Appel enregistré dans l’historique. Le dernier appel du lead n’a pas pu être actualisé. Rouvrez l’activité et réessayez avec la même saisie.' });
        }
      }
      return res.json({ lead });
    }
    throw authError(400, 'Action inconnue.');
  } catch (error) { sendAuthError(res, error); }
}
