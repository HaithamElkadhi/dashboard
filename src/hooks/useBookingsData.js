import { useCallback, useEffect, useState } from 'react';
import {
  fetchBookings,
  fetchPeopleForPicker,
  fetchBookingSelectChoices,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../lib/airtable.js';
import { BOOKING_STATUSES, MEETING_TYPES } from '../lib/config.js';


export function useBookingsData() {
  const cached = null; // Protected data lives only in this mounted authenticated view.

  const [bookings, setBookings] = useState(cached?.bookings ?? []);
  const [people, setPeople] = useState(cached?.people ?? []);
  const [statuses, setStatuses] = useState(
    cached?.statuses?.length ? cached.statuses : BOOKING_STATUSES
  );
  const [meetingTypes, setMeetingTypes] = useState(
    cached?.meetingTypes?.length ? cached.meetingTypes : MEETING_TYPES
  );
  const [status, setStatus] = useState(cached ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [nextBookings, nextPeople, choices] = await Promise.all([
        fetchBookings(),
        fetchPeopleForPicker(),
        fetchBookingSelectChoices().catch(() => ({
          statuses: BOOKING_STATUSES,
          meetingTypes: MEETING_TYPES,
        })),
      ]);
      const nextStatuses = choices.statuses?.length
        ? choices.statuses
        : BOOKING_STATUSES;
      const nextTypes = choices.meetingTypes?.length
        ? choices.meetingTypes
        : MEETING_TYPES;
      const now = new Date();
      setBookings(nextBookings);
      setPeople(nextPeople);
      setStatuses(nextStatuses);
      setMeetingTypes(nextTypes);
      setLastUpdated(now);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!cached) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = useCallback(
    async (input) => {
      const created = await createBooking(input);
      setBookings((prev) => {
        const next = [created, ...prev];
        return next;
      });
      return created;
    },
    [people, statuses, meetingTypes]
  );

  const update = useCallback(
    async (recordId, input) => {
      let previous;
      setBookings((prev) => {
        previous = prev;
        return prev.map((b) => (b.id === recordId ? { ...b, ...input } : b));
      });
      try {
        const updated = await updateBooking(recordId, input);
        setBookings((prev) => {
          const next = prev.map((b) => (b.id === recordId ? updated : b));
          return next;
        });
        return updated;
      } catch (err) {
        setBookings(previous);
        throw err;
      }
    },
    [people, statuses, meetingTypes]
  );

  const remove = useCallback(
    async (recordId) => {
      await deleteBooking(recordId);
      setBookings((prev) => {
        const next = prev.filter((b) => b.id !== recordId);
        return next;
      });
      return recordId;
    },
    [people, statuses, meetingTypes]
  );

  return {
    bookings,
    people,
    statuses,
    meetingTypes,
    status,
    error,
    lastUpdated,
    refresh: load,
    create,
    update,
    remove,
  };
}
