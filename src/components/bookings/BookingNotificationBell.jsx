import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingNotifications } from '../../contexts/BookingNotificationsContext.jsx';
import { relativeTime } from '../../lib/taskDates.js';
import { BellIcon, CalendarIcon, CheckIcon, ClockIcon, UserIcon, XIcon } from '../icons.jsx';

function appointmentLabel(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
    : 'Date to be confirmed';
}

export default function BookingNotificationBell() {
  const { notifications, status, error, markRead, refresh } = useBookingNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const container = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const navigate = useNavigate();
  const unread = notifications.filter((item) => !item.read).length;
  const visible = filter === 'unread' ? notifications.filter((item) => !item.read) : notifications;
  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const outside = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return <div ref={container} className="relative">
    <button ref={trigger} type="button" onClick={() => setOpen((value) => !value)}
      title="Notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      aria-expanded={open} aria-controls="booking-notifications" aria-haspopup="dialog"
      className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${open ? 'bg-blue-50 text-navy' : 'bg-canvas text-text-muted hover:text-navy'}`}>
      <BellIcon size={21} />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-red-600 px-1 text-[10px] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>}
    </button>
    <span className="sr-only" role="status" aria-live="polite">{unread} unread notifications</span>
    {open && <section ref={panel} tabIndex={-1} id="booking-notifications" role="dialog" aria-modal="false" aria-labelledby="notification-title"
      onBlur={(event) => { if (event.relatedTarget && !container.current?.contains(event.relatedTarget)) setOpen(false); }}
      className="fixed inset-x-4 top-20 z-30 overflow-hidden rounded-xl border border-border bg-surface shadow-xl outline-none sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[400px] sm:max-w-[calc(100vw-2rem)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 id="notification-title" className="text-xl font-semibold text-navy">Notifications</h2>
        <button type="button" onClick={close} aria-label="Close notifications" className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:bg-canvas"><XIcon size={18} /></button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-2">
        <div className="flex gap-1" aria-label="Filter notifications">
          {[['all', 'All'], ['unread', 'Unread']].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${filter === value ? 'bg-blue-50 text-navy' : 'text-text-muted hover:bg-canvas'}`}>{label}</button>)}
        </div>
        <button type="button" disabled={!unread} onClick={() => markRead(notifications.map((item) => item.id))}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-navy hover:underline disabled:opacity-40 disabled:no-underline"><CheckIcon size={14} />Mark all as read</button>
      </div>
      <div className="max-h-[min(65vh,560px)] overflow-y-auto overscroll-contain scroll-thin">
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-text-strong">Students & bookings</h3>
          <span className="text-xs text-text-muted">Last 7 days</span>
        </div>
        {status === 'loading' && <p role="status" className="px-5 py-6 text-sm text-text-muted">Loading notifications…</p>}
        {error && <div role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" onClick={refresh} className="ml-2 min-h-11 font-semibold underline">Retry</button></div>}
        {status === 'ready' && visible.length === 0 && <div className="px-5 py-8 text-center"><BellIcon size={28} className="mx-auto mb-3 text-text-muted" /><p className="text-sm font-medium text-text-strong">{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</p><p className="mt-1 text-xs text-text-muted">New students, bookings and reminders will appear here.</p></div>}
        <ul className="px-2 pb-2">
          {visible.map((item) => <li key={item.id}>
            <button type="button" onClick={() => {
              markRead([item.id]); setOpen(false);
              navigate(item.href);
            }} className={`my-1 flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy ${item.read ? '' : 'bg-blue-50/70'}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.kind === 'reminder' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-navy'}`}>
                {item.kind === 'student' ? <UserIcon size={22} /> : item.kind === 'reminder' ? <ClockIcon size={22} /> : <CalendarIcon size={22} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-strong">{item.title}</span>
                <span className="block break-words text-sm text-text-strong">{item.name}</span>
                <span className="mt-1 block text-xs text-text-muted">{item.kind === 'student' ? 'Added to the student database' : <>{appointmentLabel(item.dateTime)}{item.meetingType ? ` · ${item.meetingType}` : ''}</>}</span>
                <span className={`mt-1 block text-xs ${item.read ? 'text-text-muted' : 'font-medium text-navy'}`}>{relativeTime(new Date(item.at))}</span>
              </span>
              {!item.read && <span className="mt-5 h-2.5 w-2.5 shrink-0 rounded-full bg-navy" aria-label="Unread" />}
            </button>
          </li>)}
        </ul>
      </div>
    </section>}
  </div>;
}
