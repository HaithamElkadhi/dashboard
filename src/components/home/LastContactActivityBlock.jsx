import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, SearchIcon } from '../icons.jsx';
import { CONTACT_KIND_LABELS, homeContactActivity } from '../../lib/homeContactActivity.js';

function displayDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date unavailable';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis', day: 'numeric', month: 'short', year: 'numeric',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit' }) }).format(new Date(value));
}

export default function LastContactActivityBlock({ prospects, loading, warnings = [], onRetry }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const activity = useMemo(() => homeContactActivity(prospects), [prospects]);
  const search = query.trim().toLowerCase();
  const filtered = useMemo(() => activity.filter((entry) => !search ||
    [entry.studentName, entry.title, entry.status, entry.by, CONTACT_KIND_LABELS[entry.kind]]
      .filter(Boolean).join(' ').toLowerCase().includes(search)), [activity, search]);

  return <section className="overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-navy"><ClockIcon size={20} /></span>
        <div><h2 className="text-base font-semibold text-navy">Last contact activity</h2>
          <p className="mt-0.5 text-xs text-text-muted">All students · most recent first</p></div>
      </div>
      <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border px-3 text-text-muted sm:w-72">
        <SearchIcon size={16} /><span className="sr-only">Search contact activity</span>
        <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20); }}
          placeholder="Search students or activity…" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-text-strong outline-none" />
      </label>
    </div>
    {warnings.length > 0 && <div role="status" className="border-b border-border bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
      <p>Some contact activity could not be loaded.</p><p className="mt-1 text-xs">{warnings.join(' ')}</p>
      <button type="button" onClick={onRetry} disabled={loading} className="min-h-11 font-medium underline disabled:opacity-50">Refresh activity</button>
    </div>}
    {loading ? <div role="status" aria-label="Loading contact activity" className="space-y-4 p-6">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-14 rounded-lg" />)}
    </div> : filtered.length === 0 ? <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium text-text-strong">{search ? 'No matching activity' : 'No contact activity yet'}</p>
      <p className="mt-1 text-xs text-text-muted">{search ? 'Try another student name or keyword.' : 'Student contact history, emails, tickets, bookings and notes will appear here.'}</p>
    </div> : <>
      <ul className="max-h-[480px] divide-y divide-border overflow-y-auto overscroll-contain scroll-thin">
        {filtered.slice(0, limit).map((entry) => <li key={entry.key} className="flex flex-col gap-2 px-4 py-4 transition hover:bg-canvas sm:flex-row sm:items-start sm:gap-5 sm:px-6">
          <div className="min-w-0 sm:w-52 sm:shrink-0">
            <Link to={entry.studentHref} className="break-words text-sm font-semibold text-navy hover:underline">{entry.studentName}</Link>
            <p className="mt-1 text-xs tabular-nums text-text-muted"><time dateTime={entry.at || undefined}>{displayDate(entry.at)}</time></p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-navy">{CONTACT_KIND_LABELS[entry.kind] || 'Activity'}</span>
              {entry.status && <span className="text-xs text-text-muted">{entry.status}</span>}
              {entry.by && <span className="text-xs text-text-muted">By {entry.by}</span>}</div>
            <p className="mt-1.5 whitespace-pre-line break-words text-sm text-text-strong">{entry.title || 'Contact activity'}</p>
            {entry.appointmentAt && <p className="mt-1 text-xs text-text-muted">Booking: {displayDate(entry.appointmentAt)}</p>}
          </div>
          <Link to={entry.href} className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-navy hover:underline">Open details →</Link>
        </li>)}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
        <p className="text-xs text-text-muted">Showing {Math.min(limit, filtered.length)} of {filtered.length} activities</p>
        {limit < filtered.length && <button type="button" onClick={() => setLimit((value) => value + 20)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-navy hover:bg-canvas">Show more</button>}
      </div>
    </>}
  </section>;
}
