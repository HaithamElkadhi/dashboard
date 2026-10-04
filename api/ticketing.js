import { randomUUID } from 'node:crypto';
import { requireUser, checkOrigin, authError, sendAuthError, airtable, USERS_TABLE } from './_lib/auth.js';
import { BASE_ID, TABLES } from '../src/lib/config.js';
import { TICKET_HISTORY_TABLE, TICKET_FIELDS } from '../src/lib/ticketing.js';

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { user } = await requireUser(req, env);
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) throw authError(405, 'Method not allowed.');
    if (req.method !== 'GET') checkOrigin(req, env);
    const request = async (path, method = 'GET', body) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const response = await fetch(`https://api.airtable.com/v0/${path}`, { method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
        if (response.status === 429 && attempt < 3) { await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 500)); continue; }
        if (!response.ok) throw Object.assign(authError(response.status === 404 ? 404 : 503, 'Airtable could not complete this action. Refresh the ticket and history before retrying.'), { upstreamStatus: response.status });
        return response.json();
      }
    };
    if (req.method === 'GET') {
      if (new URL(req.url, 'http://internal').searchParams.get('users') === '1') {
        const users = [];
        let offset;
        do {
          const params = new URLSearchParams({ filterByFormula: '{is_active}=TRUE()', pageSize: '100' });
          for (const field of ['username', 'display_name', 'is_active']) params.append('fields[]', field);
          if (offset) params.set('offset', offset);
          const page = await airtable(USERS_TABLE + '?' + params, { env });
          users.push(...(page.records || []).filter(record => record.fields.is_active === true).map(record => ({ id: record.id, username: record.fields.username, displayName: record.fields.display_name || record.fields.username })));
          offset = page.offset;
        } while (offset);
        return res.json({ users });
      }
      const recordId = new URL(req.url, 'http://internal').searchParams.get('recordId');
      if (!/^rec[A-Za-z0-9]+$/.test(recordId || '')) throw authError(400, 'Invalid ticket.');
      const records = [];
      let offset;
      do {
        const params = new URLSearchParams({ filterByFormula: "{Ticket Record ID}='" + recordId + "'", pageSize: '100', 'sort[0][field]': 'Occurred At', 'sort[0][direction]': 'desc' });
        if (offset) params.set('offset', offset);
        const page = await request(BASE_ID + '/' + TICKET_HISTORY_TABLE + '?' + params);
        records.push(...(page.records || [])); offset = page.offset;
      } while (offset);
      return res.json({ records });
    }
    const { recordId, input = {}, comment = '', expected } = req.body || {};
    if (typeof comment !== 'string' || comment.length > 10000) throw authError(400, 'Comment must contain at most 10,000 characters.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw authError(400, 'Invalid ticket.');
    const creating = req.method === 'POST';
    if (!creating && !/^rec[A-Za-z0-9]+$/.test(recordId || '')) throw authError(400, 'Invalid record.');
    let previous;
    if (!creating) {
      const record = await request(`${BASE_ID}/${TABLES.tasks}/${recordId}`);
      if (record.fields?.Type !== 'Ticket') throw authError(403, 'This record is not a ticket.');
      previous = record;
      if (expected && (['status', 'assignedTo'].some(key => Object.hasOwn(expected, key) && (record.fields[TICKET_FIELDS[key]] || '') !== expected[key]))) throw authError(409, 'This ticket changed since you opened it. Refresh before saving.');
    }
    const fields = {};
    for (const [key, value] of Object.entries(input)) {
      if (!Object.hasOwn(TICKET_FIELDS, key) || key === 'recordKind') throw authError(400, 'Unsupported ticket field.');
      if (key === 'linkedProspectIds') {
        if (!Array.isArray(value) || value.length > 20 || value.some((id) => typeof id !== 'string' || !/^rec[A-Za-z0-9]+$/.test(id))) throw authError(400, 'Invalid student links.');
      } else if (typeof value !== 'string' || value.length > 50000) throw authError(400, 'Invalid field value.');
      if (key === 'ddl' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw authError(400, 'Invalid due date.');
      if (key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw authError(400, 'Invalid email.');
      fields[TICKET_FIELDS[key]] = key === 'ddl' ? value || null : value;
    }
    if (creating && (!input.subject?.trim() || !input.description?.trim() || !input.linkedProspectIds?.length || !input.type || !input.priority)) throw authError(400, 'Subject, description, student, category and priority are required.');
    const deleting = req.method === 'DELETE';
    if (deleting && req.body.confirmDelete !== true) throw authError(400, 'Confirm deletion before continuing.');
    if (deleting && Object.keys(input).length) throw authError(400, 'Delete cannot modify fields.');
    if (input.assignedTo !== undefined) {
      if (input.assignedTo) {
        if (!/^rec[A-Za-z0-9]+$/.test(input.assignedTo)) throw authError(400, 'Select a platform user.');
        const assignee = await airtable(USERS_TABLE + '/' + input.assignedTo, { env });
        if (assignee.fields?.is_active !== true) throw authError(400, 'This user is inactive. Select an active platform user.');
        fields['Assigned User Name'] = (assignee.fields.display_name || assignee.fields.username) + ' (' + assignee.fields.username + ')';
      } else fields['Assigned User Name'] = '';
    }
    const schema = creating || ['status', 'priority', 'type'].some(key => input[key] !== undefined) ? await request(`meta/bases/${BASE_ID}/tables`) : { tables: [] };
    const table = schema.tables.find((t) => t.id === TABLES.tasks);
    for (const key of ['status', 'priority', 'type']) {
      if (input[key] === undefined) continue;
      const choices = table?.fields.find((f) => f.name === TICKET_FIELDS[key])?.options?.choices || [];
      if (!choices.some((c) => c.name === input[key])) throw authError(400, `Invalid ${key}. Refresh choices and retry.`);
    }
    if (creating) { fields.Type = 'Ticket'; fields['Task Status'] = 'Todo'; }
    const changed = Object.keys(fields).filter(key => JSON.stringify(previous?.fields[key] ?? '') !== JSON.stringify(fields[key] ?? ''));
    const history = async (record, eventType, result) => request(BASE_ID + '/' + TICKET_HISTORY_TABLE, 'POST', { fields: {
      'Event ID': randomUUID(), 'Ticket Record ID': record.id, 'Ticket Reference': record.fields?.['Ticket ID'] || record.id,
      'Event Type': eventType, 'Occurred At': new Date().toISOString(), 'Actor': user.displayName + ' (' + user.username + ')', 'Actor User ID': user.id,
      'Previous Status': previous?.fields['Task Status'] || '', 'New Status': fields['Task Status'] ?? previous?.fields['Task Status'] ?? '',
      'Previous Assignee': previous?.fields['Assigned User Name'] || previous?.fields['Assigned User ID'] || previous?.fields['Assigned To'] || '', 'New Assignee': fields['Assigned User Name'] ?? previous?.fields['Assigned User Name'] ?? previous?.fields['Assigned User ID'] ?? previous?.fields['Assigned To'] ?? '',
      'Comment': comment.trim(), 'Changed Fields': changed.join(', '), 'Result': result,
    } });
    if (creating) {
      const record = await request(BASE_ID + '/' + TABLES.tasks, 'POST', { fields });
      let warning;
      try { await history(record, 'Created', 'Applied'); } catch { warning = 'Ticket created, but its creation history could not be recorded.'; }
      return res.status(201).json({ ...record, warning });
    }
    if (!deleting && !changed.length) {
      if (comment.trim()) await history(previous, 'Comment', 'Applied');
      return res.json(previous);
    }
    // Prepare the event before changing/deleting the record. If history is unavailable, do not mutate the ticket.
    const event = await history(previous, deleting ? 'Deleted' : 'Updated', 'Pending');
    let record;
    try { record = await request(BASE_ID + '/' + TABLES.tasks + '/' + recordId, req.method, deleting ? undefined : { fields }); }
    catch (error) {
      // Network/5xx errors may occur after Airtable accepted the mutation: leave Pending instead of claiming failure.
      if (error.upstreamStatus >= 400 && error.upstreamStatus < 500 && error.upstreamStatus !== 429) { try { await request(BASE_ID + '/' + TICKET_HISTORY_TABLE + '/' + event.id, 'PATCH', { fields: { Result: 'Failed' } }); } catch {} }
      throw error;
    }
    let warning;
    try { await request(BASE_ID + '/' + TICKET_HISTORY_TABLE + '/' + event.id, 'PATCH', { fields: { Result: 'Applied' } }); }
    catch { warning = 'Ticket saved, but history confirmation is pending. Refresh the timeline before retrying.'; }
    return res.json(deleting ? { id: recordId, deleted: true, warning } : { ...record, warning });
  } catch (error) { sendAuthError(res, error); }
}
