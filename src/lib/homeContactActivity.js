import { parseContactHistory } from './airtable.js';

export const CONTACT_KIND_LABELS = { contact: 'Manual contact', email: 'Email', ticket: 'Ticket', appointment: 'Booking', note: 'Note' };

export function homeContactActivity(prospects) {
  const entries = [];
  for (const student of prospects) {
    const studentName = student.fullName || 'Unnamed student';
    const studentHref = `/prospects?open=${encodeURIComponent(student.id)}`;
    const manual = parseContactHistory(student.contactHistory);
    for (const [index, entry] of manual.entries()) {
      entries.push({ key: `${student.id}:contact:${index}`, studentId: student.id, studentName,
        studentHref, kind: 'contact', at: entry.date, title: entry.reason, href: studentHref });
    }
    if (!manual.length && (student.manualLastContact || (!student.activity?.length && student.lastContact))) {
      entries.push({ key: `${student.id}:last-contact`, studentId: student.id, studentName,
        studentHref, kind: 'contact', at: student.manualLastContact || student.lastContact,
        title: 'Contact recorded', href: studentHref });
    }
    const seen = new Set();
    for (const event of student.activity || []) {
      if (seen.has(event.key)) continue;
      seen.add(event.key);
      entries.push({ ...event, key: `${student.id}:${event.key}`, studentId: student.id,
        studentName, studentHref, href: event.href || studentHref });
    }
  }
  return entries.sort((a, b) => {
    const left = Date.parse(a.at), right = Date.parse(b.at);
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0)
      || a.key.localeCompare(b.key);
  });
}
