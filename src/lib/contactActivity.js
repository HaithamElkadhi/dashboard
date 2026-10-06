export const EMAIL_HISTORY_TABLE = 'tblh1SfFHOgW7gLPK';
export const contactDate = value => {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
};
export function mergeContactActivity(prospects, events) {
  const emails = new Map();
  for (const p of prospects) { const email = p.email?.trim().toLowerCase(); if (email) emails.set(email, [...(emails.get(email) || []), p.id]); }
  return prospects.map(p => {
    const activity = [...new Map(events.filter(event => event.studentIds?.length ? event.studentIds.includes(p.id) : emails.get(event.recipient?.trim().toLowerCase())?.length === 1 && emails.get(event.recipient.trim().toLowerCase())[0] === p.id).map(event => [event.key, event])).values()].sort((a,b) => b.at.localeCompare(a.at));
    const dates = activity.filter(event => event.countsAsContact).map(event => contactDate(event.at)).filter(Boolean);
    const manualLastContact = Object.hasOwn(p, 'manualLastContact') ? p.manualLastContact : p.lastContact;
    const lastContact = [manualLastContact, ...dates].filter(Boolean).sort().at(-1) || null;
    return { ...p, manualLastContact, lastContact, activity, openTicketCount: activity.filter(event => event.kind === 'ticket' && event.open).length };
  });
}
export async function fetchContactActivity() {
  const response = await fetch('/api/contact-activity', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load contact activity.');
  return data;
}
