import { useCallback, useEffect, useState } from 'react';
import { fetchTicketHistory } from '../../lib/airtable.js';

const time = (value) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export default function TicketTimeline({ ticket, onComment, comment, onCommentChange }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const setComment = onCommentChange;
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setEvents(await fetchTicketHistory(ticket.id)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [ticket.id]);
  useEffect(() => { load(); }, [load]);
  const submit = async () => {
    if (!comment.trim() || busy) return;
    setBusy(true); setError('');
    try { await onComment(comment.trim()); setComment(''); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-t border-border pt-6">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-navy">Comments & history</h3><button type="button" onClick={load} disabled={loading} className="min-h-11 px-3 text-sm text-navy underline">Refresh history</button></div>
    <label className="block space-y-2 text-sm font-medium"><span>Add a comment</span><textarea data-write="" value={comment} disabled={busy} maxLength={10000} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-lg border border-border-strong px-3 py-2" placeholder="Contact with the student, next action, or follow-up…" /></label>
    <button data-write="" type="button" disabled={busy || !comment.trim()} onClick={submit} className="min-h-11 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Adding comment…' : 'Add comment'}</button>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading && <p className="text-sm text-text-muted">Loading history…</p>}
    {!loading && !error && !events.length && <p className="rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">No history recorded yet. Earlier changes are not reconstructed.</p>}
    <ol className="space-y-5 border-l border-border pl-5">
      {events.map(({ id, fields: f }) => <li key={id} className="relative space-y-2"><span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-brand" />
        <p className="text-xs text-text-muted">{f['Occurred At'] ? time(f['Occurred At']) : 'Date unavailable'} · {f.Actor || 'Unknown author'}</p>
        <p className="text-sm font-medium text-navy">{f['Event Type'] === 'Comment' ? 'Comment added' : f['Event Type'] === 'Deleted' ? 'Ticket deleted' : f['Event Type'] === 'Created' ? 'Ticket created' : 'Ticket updated'}</p>
        {f['Previous Status'] !== f['New Status'] && <p className="text-sm">Status: {f['Previous Status'] || 'Missing status'} → {f['New Status'] || 'Missing status'}</p>}
        {f['Previous Assignee'] !== f['New Assignee'] && <p className="text-sm">Assigned to: {f['Previous Assignee'] || 'Unassigned'} → {f['New Assignee'] || 'Unassigned'}</p>}
        {f['Changed Fields'] && <p className="text-xs text-text-muted">Changed: {f['Changed Fields']}</p>}
        {f.Comment && <p className="whitespace-pre-wrap break-words rounded-lg bg-canvas p-3 text-sm">{f.Comment}</p>}
        {f.Result !== 'Applied' && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{f.Result === 'Failed' ? 'This change failed and was not applied.' : 'Completion has not been confirmed. Verify the current ticket before retrying.'}</p>}
      </li>)}
    </ol>
  </section>;
}
