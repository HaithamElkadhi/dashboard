import { bookingNotifications, NOTIFICATION_RETENTION_MS } from './bookings/notifications.js';

export function studentNotifications(students, now = Date.now()) {
  return students.flatMap((student) => {
    const at = Date.parse(student.createdTime);
    if (!Number.isFinite(at) || at > now || at < now - NOTIFICATION_RETENTION_MS) return [];
    return [{ id: `student:new:${student.id}`, studentId: student.id, kind: 'student',
      title: 'New student', name: student.fullName || 'Unnamed student', at,
      href: `/prospects?open=${encodeURIComponent(student.id)}` }];
  }).sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
}

export function dashboardNotifications(bookings, students, now = Date.now()) {
  return [...bookingNotifications(bookings, now).map((item) => ({ ...item,
    href: `/bookings?booking=${encodeURIComponent(item.bookingId)}` })),
    ...studentNotifications(students, now)]
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id)).slice(0, 100);
}
