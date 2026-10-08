export const NOTES_TABLE = 'tblvPsY4Ie2xUYkFv';
export const NOTE_STATUSES = ['Open', 'In progress', 'Completed'];
export function normalizeNote(record) {
  const f = record.fields || {}; let actions = [];
  try { actions = JSON.parse(f.Actions || '[]'); if (!Array.isArray(actions)) throw new Error(); } catch { throw new Error('A note has invalid action data. Correct it in Airtable before editing.'); }
  return { id: record.id, title: f.Title || '', content: f.Content || '', studentId: f.Student?.[0] || '', callDate: f['Call Date'] || '', status: f.Status || 'Open', actions, createdById: f['Created By ID'] || '', createdBy: f['Created By'] || '', updatedBy: f['Updated By'] || '', updatedAt: f['Updated At'] || record.createdTime || '', history: f.History || '' };
}
export const noteInput = note => Object.fromEntries(['title', 'content', 'studentId', 'callDate', 'status', 'actions'].map(key => [key, note[key]]));
export const blankNote = () => ({ title: '', content: '', studentId: '', callDate: '', status: 'Open', actions: [] });
export const actionOverdue = (action, today) => !action.done && !!action.dueDate && action.dueDate < today;
export function filterNotes(notes, filters, userId, today) {
  const query = filters.query.trim().toLowerCase();
  return notes.filter(note => (!query || `${note.title} ${note.content} ${note.actions.map(a=>a.text).join(' ')}`.toLowerCase().includes(query)) && (!filters.studentId || note.studentId === filters.studentId) && (!filters.status || note.status === filters.status) && (!filters.mine || note.createdById === userId || note.actions.some(a=>a.assignedTo === userId)) && (!filters.overdue || note.actions.some(a=>actionOverdue(a,today))));
}
export async function notesApi(body) {
  const response = await fetch('/api/notes', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load notes.'); return data;
}
