export const PROSPECTION_BASE = 'appK0Trc6L5MEKcR2';
export const LEADS_TABLE = 'tblf1vUosrzdipRTQ';
export const CALLS_TABLE = 'tblrmWU9fAO37Q45B';
export const INTERESTS = ['Non contacté', 'Injoignable', 'Intéressé', 'Non intéressé'];
export const LEAD_FIELDS = [
  ['lastName', 'Nom'], ['firstName', 'Prénom'], ['email', 'Email'],
  ['phone', 'Téléphone'], ['source', 'Source'], ['interest', 'Intérêt'], ['followUp', 'Date de rappel'],
];
export const emptyLead = () => ({ lastName: '', firstName: '', email: '', phone: '', source: '', interest: INTERESTS[0], followUp: '' });
export function cleanLeadName(value = '') {
  const words = value.trim().split(/\s+/);
  if (words.length >= 4 && words.length % 2 === 0) {
    const half = words.length / 2;
    if (words.slice(0, half).join(' ').toLocaleLowerCase() === words.slice(half).join(' ').toLocaleLowerCase()) return words.slice(0, half).join(' ');
  }
  return value.trim().replace(/\s+/g, ' ');
}
export function leadNameParts(input) {
  const lastName = cleanLeadName(input.lastName), firstName = cleanLeadName(input.firstName);
  return { lastName, firstName: lastName.toLocaleLowerCase() === firstName.toLocaleLowerCase() ? '' : firstName };
}
export function normalizeLead(record) {
  const f = record.fields || {};
  const parts = leadNameParts({ lastName: f.Nom || '', firstName: f['Prénom'] || '' });
  return { id: record.id, ...parts, name: cleanLeadName(f.Name || [parts.firstName, parts.lastName].filter(Boolean).join(' ')), email: f.Email || '', phone: f['Phone Number'] || '', source: f['Source prospection'] || f['Lead Source'] || '', interest: f['Intérêt'] || INTERESTS[0], followUp: f['Follow-up Date'] || '', lastCall: f['Last Contacted'] || '' };
}
export function validDate(value) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function leadError(input) {
  if (!input || typeof input !== 'object' || LEAD_FIELDS.some(([key]) => typeof input[key] !== 'string')) return 'Champs du lead invalides.';
  if (!input.lastName.trim() && !input.firstName.trim()) return 'Indiquez un nom ou un prénom.';
  if (input.lastName.length > 150 || input.firstName.length > 150 || input.source.length > 200 || input.phone.length > 60 || input.email.length > 254) return 'Un champ est trop long.';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Adresse email invalide.';
  if (!INTERESTS.includes(input.interest)) return 'Intérêt invalide.';
  if (!validDate(input.followUp)) return 'Date de rappel invalide.';
  return '';
}
export function leadFields(input) {
  const { firstName, lastName } = leadNameParts(input);
  return { Name: cleanLeadName([firstName, lastName].filter(Boolean).join(' ')), Nom: lastName, 'Prénom': firstName, Email: input.email.trim(), 'Phone Number': input.phone.trim(), 'Source prospection': input.source.trim(), 'Intérêt': input.interest, 'Follow-up Date': input.followUp || null };
}
export function whatsappUrl(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '').replace(/^00/, '');
  return digits.length >= 7 && digits.length <= 15 ? `https://wa.me/${digits}` : '';
}
export function mappedLead(row, mapping) {
  const input = emptyLead();
  for (const [key] of LEAD_FIELDS) if (mapping[key] !== '' && mapping[key] != null) input[key] = String(row[Number(mapping[key])] ?? '').trim();
  Object.assign(input, leadNameParts(input));
  if (!input.interest) input.interest = INTERESTS[0];
  const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  input.interest = INTERESTS.find(value => fold(value) === fold(input.interest)) || input.interest;
  if (/^\d{5}(\.\d+)?$/.test(input.followUp)) input.followUp = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(input.followUp)) * 86400000).toISOString().slice(0, 10);
  const date = input.followUp.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (date) input.followUp = `${date[3]}-${date[2]}-${date[1]}`;
  return input;
}
