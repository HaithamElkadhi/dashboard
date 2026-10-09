import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchBookingNotificationData, fetchStudentNotificationData } from '../lib/airtable.js';
import { REMINDER_LEAD_MS } from '../lib/bookings/notifications.js';
import { dashboardNotifications } from '../lib/studentNotifications.js';
import { useAuth } from './AuthContext.jsx';

const Context = createContext(null);
const readKey = (user) => `booking-notification-read:v1:${user.id || user.username}`;
function readIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string').slice(-500) : [];
  } catch { return []; }
}

function UserNotifications({ children, storageKey }) {
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [now, setNow] = useState(Date.now);
  const [read, setRead] = useState(() => readIds(storageKey));
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function load() {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const results = await Promise.allSettled([fetchBookingNotificationData(), fetchStudentNotificationData()]);
        if (active) {
          if (results[0].status === 'fulfilled') setBookings(results[0].value);
          if (results[1].status === 'fulfilled') setStudents(results[1].value);
          const failures = results.flatMap((result, index) => result.status === 'rejected'
            ? [index === 0 ? 'Booking' : 'Student'] : []);
          setNow(Date.now());
          setStatus(failures.length ? 'error' : 'ready');
          setError(failures.length ? `${failures.join(' and ')} notifications could not be refreshed.` : '');
        }
      } catch {
        if (active) { setStatus('error'); setError('Notifications could not be refreshed.'); }
      } finally { inFlight = false; }
    }
    load();
    const interval = setInterval(load, 60000);
    document.addEventListener('visibilitychange', load);
    window.addEventListener('focus', load);
    window.addEventListener('bookings-changed', load);
    window.addEventListener('students-changed', load);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener('focus', load);
      window.removeEventListener('bookings-changed', load);
      window.removeEventListener('students-changed', load);
    };
  }, [retry]);

  useEffect(() => {
    // Recompute locally at the exact next reminder time, without another API request.
    const next = bookings.map((booking) => Date.parse(booking.dateTime) - REMINDER_LEAD_MS)
      .filter((at) => Number.isFinite(at) && at > Date.now()).sort((a, b) => a - b)[0];
    const timer = setTimeout(() => setNow(Date.now()),
      next ? Math.min(Math.max(next - Date.now(), 1), 60000) : 60000);
    return () => clearTimeout(timer);
  }, [bookings, now]);

  useEffect(() => {
    const sync = (event) => { if (event.key === storageKey) setRead(readIds(storageKey)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  const markRead = useCallback((ids) => {
    setRead((previous) => {
      const next = [...new Set([...previous, ...ids])].slice(-500);
      return next;
    });
  }, []);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(read)); } catch { /* Session-only if storage is unavailable. */ }
  }, [storageKey, read]);
  const notifications = useMemo(() => {
    const readSet = new Set(read);
    return dashboardNotifications(bookings, students, now).map((item) => ({ ...item, read: readSet.has(item.id) }));
  }, [bookings, students, now, read]);

  return <Context.Provider value={{ notifications, status, error, markRead,
    refresh: () => setRetry((value) => value + 1) }}>{children}</Context.Provider>;
}

export function BookingNotificationsProvider({ children }) {
  const { user } = useAuth();
  const storageKey = readKey(user);
  return <UserNotifications key={storageKey} storageKey={storageKey}>{children}</UserNotifications>;
}
export function useBookingNotifications() { return useContext(Context); }
