import test from 'node:test';
import assert from 'node:assert/strict';
import { studentNotifications, dashboardNotifications } from '../src/lib/studentNotifications.js';

const now = Date.parse('2026-10-09T12:00:00Z');
const student = { id: 'recStudent', fullName: 'Test Student', createdTime: '2026-10-09T11:00:00Z' };
test('new database records generate student notifications with direct links', () => {
  const feed = studentNotifications([student], now);
  assert.equal(feed.length, 1);
  assert.equal(feed[0].title, 'New student');
  assert.equal(feed[0].name, student.fullName);
  assert.equal(feed[0].href, '/prospects?open=recStudent');
  assert.equal(feed[0].at, Date.parse(student.createdTime));
});
test('student edits retain the same notification identity', () => {
  assert.equal(studentNotifications([student], now)[0].id,
    studentNotifications([{ ...student, fullName: 'Updated name' }], now)[0].id);
});
test('old, future and invalid creation dates do not notify', () => {
  for (const createdTime of ['2026-10-01T12:00:00Z', '2026-10-10T12:00:00Z', null, 'invalid']) {
    assert.deepEqual(studentNotifications([{ ...student, createdTime }], now), []);
  }
});
test('student and booking notifications are combined newest first and keep separate IDs', () => {
  const booking = { id: 'recStudent', studentName: 'Booking Student',
    createdTime: '2026-10-09T10:00:00Z', dateTime: '2026-10-09T12:30:00Z', bookingStatus: 'Scheduled' };
  const feed = dashboardNotifications([booking], [student], now);
  assert.deepEqual(feed.map((item) => item.kind), ['reminder', 'student', 'new']);
  assert.equal(new Set(feed.map((item) => item.id)).size, 3);
  assert.equal(feed[0].href, '/bookings?booking=recStudent');
});
test('unnamed students have a fallback; combined feed remains bounded', () => {
  assert.equal(studentNotifications([{ ...student, fullName: '' }], now)[0].name, 'Unnamed student');
  const students = Array.from({ length: 120 }, (_, index) => ({ ...student, id: `rec${index}` }));
  assert.equal(dashboardNotifications([], students, now).length, 100);
});
