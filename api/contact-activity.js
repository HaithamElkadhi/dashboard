import { requireUser, sendAuthError, authError } from './_lib/auth.js';
import { BASE_ID, TABLES, BK } from '../src/lib/config.js';
import { DOCUMENT_TABLES } from '../src/lib/studentDocuments.js';
import { EMAIL_HISTORY_TABLE } from '../src/lib/contactActivity.js';
let queue = Promise.resolve();
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    await requireUser(req, env);
    const list = async (table, fields, formula, ids = false) => {
      let offset; const records = [];
      do {
        const params = new URLSearchParams({ pageSize: '100' });
        if (ids) params.set('returnFieldsByFieldId', 'true');
        if (formula) params.set('filterByFormula', formula);
        if (offset) params.set('offset', offset);
        fields.forEach(field => params.append('fields[]', field));
        const operation = queue.then(async () => {
          const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}?${params}`, { headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }, signal: AbortSignal.timeout(20000) });
          if (!response.ok) throw authError(503, 'Activity source unavailable.');
          return response.json();
        });
        queue = operation.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 225)));
        const page = await operation; records.push(...(page.records || [])); offset = page.offset;
      } while (offset);
      return records;
    };
    const events = [], warnings = [];
    const source = async (name, run) => { try { await run(); } catch { warnings.push(`${name} activity unavailable. Refresh to retry.`); } };
    await source('Ticket', async () => {
      const records = await list(TABLES.tasks, ['Type', 'Objet', 'Task Status', 'Linked Prospect', 'Client Email', 'Date de création'], "{Type}='Ticket'");
      for (const r of records) { const f = r.fields; events.push({ key: `ticket:${r.id}`, kind: 'ticket', at: f['Date de création'] || r.createdTime, studentIds: f['Linked Prospect'] || [], recipient: f['Client Email'] || '', title: f.Objet || 'Ticket created', status: f['Task Status'] || 'No status', open: !['Done', 'Archived'].includes(f['Task Status']), countsAsContact: true, href: `/ticketing?ticket=${r.id}` }); }
    });
    await source('Appointment', async () => {
      const records = await list(TABLES.bookings, [BK.linkedProspect, BK.email, BK.dateTime, BK.bookingStatus, BK.meetingType], null, true);
      for (const r of records) { const f = r.fields; events.push({ key: `booking:${r.id}`, kind: 'appointment', at: r.createdTime, studentIds: f[BK.linkedProspect] || [], recipient: f[BK.email] || '', title: f[BK.meetingType] || 'Appointment booked', appointmentAt: f[BK.dateTime] || '', status: f[BK.bookingStatus] || 'Scheduled', countsAsContact: true, href: '/bookings' }); }
    });
    await source('Document email', async () => {
      const records = await list(DOCUMENT_TABLES.activity, ['Student Record ID', 'Occurred At', 'Subject', 'Recipient', 'Result', 'Provider ID'], "AND({Action}='Email',{Result}='Sent')");
      for (const r of records) { const f = r.fields; events.push({ key: f['Provider ID'] ? `email:${f['Provider ID']}` : `document-email:${r.id}`, kind: 'email', at: f['Occurred At'] || r.createdTime, studentIds: f['Student Record ID'] ? [f['Student Record ID']] : [], recipient: f.Recipient || '', title: f.Subject || 'Email sent', status: 'Sent', countsAsContact: true, href: f['Student Record ID'] ? `/students/${f['Student Record ID']}/documents` : '' }); }
    });
    await source('Platform email', async () => {
      const records = await list(EMAIL_HISTORY_TABLE, ['Provider ID', 'Recipient', 'Subject', 'Sent At']);
      for (const r of records) { const f = r.fields; events.push({ key: `email:${f['Provider ID'] || r.id}`, kind: 'email', at: f['Sent At'] || r.createdTime, studentIds: [], recipient: f.Recipient || '', title: f.Subject || 'Email sent', status: 'Sent', countsAsContact: true, href: '' }); }
    });
    res.json({ events, warnings });
  } catch (error) { sendAuthError(res, error); }
}
