const field = (name, type = 'text', extra = {}) => ({ name, type, ...extra });
const link = (name, target, multiple = false) => field(name, 'link', { target, multiple });
export const EDUCATION_UI = {
  students: { label: 'Élèves', singular: 'élève', primary: 'Nom complet', columns: ['Classe', 'Parents'], fields: [field('Nom complet'), field('Photo', 'attachments'), link('Classe', 'classes'), link('Parents', 'parents', true)] },
  parents: { label: 'Parents', singular: 'parent', primary: 'Nom complet', columns: ['Email', 'Téléphone'], fields: [field('Nom complet'), field('Email', 'email'), field('Téléphone', 'tel')] },
  classes: { label: 'Classes', singular: 'classe', primary: 'Classe', columns: ['Niveau', 'Année scolaire'], fields: [field('Classe'), field('Niveau'), field('Année scolaire')] },
  results: { label: 'Notes et copies', singular: 'note', primary: 'Examen', columns: ['Date', 'Note'], fields: [field('Examen', 'hidden'), link('Élève', 'students'), field('Date', 'date'), field('Note', 'number'), field('Copies d’examen', 'attachments'), field('Commentaire', 'textarea', { label: 'Observation du maître' })] },
  events: { label: 'Observations et discipline', singular: 'observation', primary: 'Objet', columns: ['Date', 'Catégorie'], fields: [field('Objet', 'hidden'), link('Élève', 'students'), field('Date', 'date'), field('Catégorie', 'select', { choices: ['Observation', 'Discipline'] }), field('Observation', 'textarea'), field('Auteur', 'text', { label: 'Maître' })] },
};
export const EDUCATION_TABS = { students: 'Élèves', classes: 'Classes', attendance: 'Appel' };
export function educationLabel(entity, record) { return record?.fields?.[EDUCATION_UI[entity]?.primary] || 'Sans nom'; }
export function educationText(entity, name, value, tables) {
  const descriptor = EDUCATION_UI[entity]?.fields.find(field => field.name === name);
  if (descriptor?.type === 'link') return (value || []).map(id => educationLabel(descriptor.target, tables[descriptor.target]?.find(record => record.id === id))).join(', ') || '—';
  return value === undefined || value === null || value === '' ? '—' : String(value);
}
export function educationToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function educationEmailTemplate(kind, student, source) {
  const name = educationLabel('students', student), fields = source?.fields || {};
  if (kind === 'note') return { subject: `Note scolaire — ${name}`, body: `Bonjour,\n\nVoici la note de ${name}${fields.Date ? ` du ${fields.Date}` : ''} : ${fields.Note ?? '[note]'} / ${fields['Barème'] || 20}.\n\n${fields.Commentaire || '[Observation du maître]'}\n\n${fields['Copies d’examen']?.length ? 'La copie est jointe à cet email.\n\n' : ''}Cordialement,\nLe maître` };
  if (kind === 'observation') return { subject: `${fields.Catégorie === 'Discipline' ? 'Discipline' : 'Observation'} — ${name}`, body: `Bonjour,\n\nJe souhaite vous partager une observation concernant ${name}${fields.Date ? ` du ${fields.Date}` : ''}.\n\n${fields.Observation || '[Écrivez votre observation ici]'}\n\nJe reste disponible pour en discuter avec vous.\n\nCordialement,\n${fields.Auteur || 'Le maître'}` };
  return { subject: '', body: '' };
}
