import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingNotifications, REMINDER_LEAD_MS } from '../src/lib/bookings/notifications.js';

const startsAt = Date.parse('2026-10-09T14:00:00Z');
const booking = { id: 'recBooking', studentName: 'Test Student',
  createdTime: '2026-10-09T10:00:00Z', dateTime: '2026-10-09T14:00:00Z',
  bookingStatus: 'Scheduled', meetingType: 'Consultation' };
const reminders = (records, now) => bookingNotifications(records, now).filter((item) => item.kind === 'reminder');

test('new booking notification is based on creation time, and identical for everyone', () => {
  const first = bookingNotifications([booking], startsAt - REMINDER_LEAD_MS - 1);
  assert.equal(first.length, 1);
  assert.equal(first[0].kind, 'new');
  assert.equal(first[0].bookingId, booking.id);
  assert.equal(first[0].name, 'Test Student');
  assert.deepEqual(first, bookingNotifications([booking], startsAt - REMINDER_LEAD_MS - 1));
});
test('reminder becomes visible exactly 30 minutes before the booking', () => {
  assert.equal(reminders([booking], startsAt - REMINDER_LEAD_MS - 1).length, 0);
  assert.equal(reminders([booking], startsAt - REMINDER_LEAD_MS).length, 1);
  assert.equal(reminders([booking], startsAt - REMINDER_LEAD_MS)[0].at, startsAt - REMINDER_LEAD_MS);
});
test('reminder remains available after returning to the dashboard', () => {
  assert.equal(reminders([booking], startsAt + 60000).length, 1);
});
test('cancelled, completed and no-show bookings do not produce reminders', () => {
  for (const bookingStatus of ['Cancelled', ' CANCELED ', 'Completed', 'No-show']) {
    assert.equal(reminders([{ ...booking, bookingStatus }], startsAt).length, 0);
  }
});
test('rescheduling produces a distinct reminder and removes the old reminder', () => {
  const old = reminders([booking], startsAt)[0];
  const rescheduled = { ...booking, dateTime: '2026-10-09T16:00:00Z' };
  assert.equal(reminders([rescheduled], startsAt).length, 0);
  const next = reminders([rescheduled], startsAt + 2 * 60 * 60 * 1000)[0];
  assert.notEqual(next.id, old.id);
});
test('booking created within 30 minutes has an immediate reminder', () => {
  const createdAt = startsAt - 5 * 60 * 1000;
  const recent = { ...booking, createdTime: new Date(createdAt).toISOString() };
  assert.equal(reminders([recent], createdAt)[0].at, createdAt);
  assert.equal(reminders([recent], createdAt - 1).length, 0);
});
test('bookings created after their start, invalid dates and old events do not generate reminders', () => {
  assert.equal(reminders([{ ...booking, createdTime: new Date(startsAt + 1).toISOString() }], startsAt + 1).length, 0);
  assert.equal(reminders([{ ...booking, dateTime: 'invalid' }], startsAt).length, 0);
  assert.equal(bookingNotifications([booking], startsAt + 8 * 24 * 60 * 60 * 1000).length, 0);
});
test('feed is bounded and newest first, without mutating bookings', () => {
  const records = Array.from({ length: 120 }, (_, index) => ({ ...booking, id: `rec${index}`, createdTime: new Date(startsAt - index * 1000).toISOString() }));
  const before = structuredClone(records);
  const feed = bookingNotifications(records, startsAt);
  assert.equal(feed.length, 100);
  assert.ok(feed.every((item, index) => index === 0 || item.at <= feed[index - 1].at));
  assert.deepEqual(records, before);
});
