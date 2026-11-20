import { ACC } from './config.js';

export const LINKED_ACCOUNTS_FIELD = 'flddNBP0jC3rYtcF0';

export function accountQueries(students) {
  const ids = [...new Set(students.flatMap(({ fields }) => {
    const linked = fields?.[LINKED_ACCOUNTS_FIELD];
    return Array.isArray(linked) ? linked.filter(id => typeof id === 'string' && /^rec[A-Za-z0-9]+$/.test(id)) : [];
  }))];
  const queries = [];
  for (let start = 0; start < ids.length; start += 50) {
    const terms = ids.slice(start, start + 50).map(id => `RECORD_ID()='${id}'`);
    const query = new URLSearchParams({
      returnFieldsByFieldId: 'true',
      filterByFormula: terms.length === 1 ? terms[0] : `OR(${terms.join(',')})`,
    });
    for (const field of [ACC.prospectLink, ACC.label, ACC.mailUser]) query.append('fields[]', field);
    queries.push(query);
  }
  return queries;
}

export function candidatureEmail(student, accountsById) {
  const linked = student.fields?.[LINKED_ACCOUNTS_FIELD];
  if (!Array.isArray(linked)) return '';
  for (const id of linked) {
    const fields = accountsById.get(id)?.fields;
    if (!Array.isArray(fields?.[ACC.prospectLink]) || !fields[ACC.prospectLink].includes(student.id)) continue;
    if (!Array.isArray(fields[ACC.label]) || !fields[ACC.label].includes('Email Candidature')) continue;
    const email = String(fields[ACC.mailUser] || '').trim();
    if (/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return email;
  }
  return '';
}
