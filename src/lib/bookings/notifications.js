export const REMINDER_LEAD_MS = 30 * 60 * 1000;
export const NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Derive the same feed for every user, including bookings created outside the app.
export function bookingNotifications(bookings, now = Date.now()) {
  const notifications = [];
  const cutoff = now - NOTIFICATION_RETENTION_MS;
  for (const booking of bookings) {
    const createdAt = Date.parse(booking.createdTime);
    const startsAt = Date.parse(booking.dateTime);
    const name = booking.studentName || booking.name || 'Booking';
    if (Number.isFinite(createdAt) && createdAt >= cutoff && createdAt <= now) {
      notifications.push({ id: `booking:new:${booking.id}`, bookingId: booking.id,
        kind: 'new', title: 'New booking', name, at: createdAt,
        dateTime: booking.dateTime, meetingType: booking.meetingType });
    }
    const inactive = ['cancelled', 'canceled', 'completed', 'no-show'].includes(
      String(booking.bookingStatus).trim().toLowerCase());
    // A booking made within the reminder window becomes due immediately.
    const reminderAt = Math.max(startsAt - REMINDER_LEAD_MS,
      Number.isFinite(createdAt) ? createdAt : -Infinity);
    if (!inactive && Number.isFinite(startsAt) && reminderAt < startsAt &&
        reminderAt >= cutoff && reminderAt <= now) {
      notifications.push({ id: `booking:reminder:${booking.id}:${startsAt}`, bookingId: booking.id,
        kind: 'reminder', title: startsAt > now ? 'Booking starts soon' : 'Booking reminder',
        name, at: reminderAt, dateTime: booking.dateTime, meetingType: booking.meetingType });
    }
  }
  return notifications.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id)).slice(0, 100);
}
