import { ACADEMIC_LEVEL_OPTIONS, normalizeAcademicLevel, previousStudies } from './proposalItaly/academicProfile.js';
import { PF } from './config.js';

export const ADMISSION_REQUIREMENTS_FIELD = 'fldsMJ7gvO2Qz9UzT';
export const PREVIOUS_STUDIES_FIELD = PF.previousStudies;
export { ACADEMIC_LEVEL_OPTIONS };
export const ACADEMIC_LEVELS = ACADEMIC_LEVEL_OPTIONS.map(option => option.value);
export const DIPLOMAS = [
  { id: 'Bac', label: 'Baccalauréat' }, { id: 'Licence', label: 'Licence (Bachelor’s)' },
  { id: 'Master', label: 'Master' }, { id: 'Engineering Degree', label: 'Diplôme d’Ingénieur' },
  { id: 'PhD', label: 'Doctorat / PhD' }, { id: 'BTS', label: 'BTS' }, { id: 'BTP', label: 'BTP' },
];
export const GAP_TYPES = [
  { id: 'stage', label: 'Stage', name: 'Attestation de stage' },
  { id: 'work', label: 'Travail', name: 'Attestation de travail' },
  { id: 'training', label: 'Formation', name: 'Attestation de formation' },
  { id: 'other', label: 'Autre', name: 'Document justificatif' },
];
export const CONSULTANT_CHECKS = [
  'Identifier le cas de figure académique applicable', 'Demander en priorité les documents urgents',
  'Vérifier la lisibilité et la cohérence des pièces reçues', 'Vérifier les exigences propres à chaque université',
];
const item = (id, name, category = 'academic', urgency = '') => ({ id, name, category, urgency });
const common = [
  item('photo', 'Photo d’identité', 'general', 'Urgent'), item('passport', 'Passeport (vérifier la date d’expiration)', 'general', 'Urgent'), item('cv', 'CV', 'general', 'Urgent'),
  ...[['language', 'Certificat de langue (anglais ou italien)'], ['ddv', 'Déclaration de valeur ou CIMEA'], ['rec1', 'Lettre de recommandation 1'], ['rec2', 'Lettre de recommandation 2']].map(([id, name]) => item(id, name, 'general', 'Moins urgent')),
];
const bac = [item('bac_dip', 'Diplôme du Baccalauréat'), item('bac_tr', 'Relevé de notes Bac')];
const licence = [...bac, item('lic_dip', 'Diplôme de Licence'), ...[1, 2, 3].map(n => item(`lic_tr${n}`, `Relevé de notes Licence - année ${n}`)), item('plan_licence', 'Plan d’études - Licence')];
const master = [...licence, item('mas_dip', 'Diplôme de Master / Ingénieur'), ...[1, 2].map(n => item(`mas_tr${n}`, `Relevé de notes Master - année ${n}`)), item('plan_master', 'Plan d’études - Master')];
const engineer = [...bac, ...[1, 2].map(n => item(`prepa_tr${n}`, `Relevé de notes Prépa - année ${n}`)), ...[1, 2, 3].map(n => item(`eng_tr${n}`, `Relevé de notes Cycle Ingénieur - année ${n}`)), item('eng_dip', 'Diplôme d’Ingénieur'), item('plan_engineer', 'Plan d’études - Ingénieur')];
const phd = [...master, item('phd_dip', 'Diplôme de Doctorat / PhD'), item('plan_doctorat', 'Plan d’études - Doctorat')];

export function buildAdmissionRequirements(profile) {
  if (!profile) return [];
  const obtained = new Set(profile.diplomas.map(diploma => diploma.type));
  const documents = [...common];
  if (obtained.has('PhD')) documents.push(...phd);
  else if (obtained.has('Master')) documents.push(...master);
  else if (obtained.has('Licence')) documents.push(...licence);
  if (obtained.has('Engineering Degree')) documents.push(...(profile.engineeringRoute === 'prepa' ? engineer : profile.engineeringRoute === 'licence' ? master : []));
  if (obtained.has('Bac') && !documents.some(doc => doc.id === 'bac_dip')) {
    documents.push(bac[0], item('bac_tr_secondary', 'Relevé de notes Bac - 3ème année secondaire'));
  }
  for (const diploma of profile.diplomas.filter(diploma => diploma.institutionType === 'private')) {
    documents.push(item(`equivalence:${diploma.type}`, `Attestation d’équivalence - ${DIPLOMAS.find(option => option.id === diploma.type)?.label || diploma.type}`, 'private', 'Moins urgent'));
  }
  for (const gap of GAP_TYPES.filter(gap => profile.gaps.includes(gap.id))) documents.push(item(`gap:${gap.id}`, gap.id === 'other' && profile.otherGap.trim() ? profile.otherGap.trim() : gap.name, 'experience'));
  return [...new Map(documents.map(doc => [doc.id, doc])).values()];
}

export function seedAdmissionProfile(fields) {
  const lastField = previousStudies(fields, PREVIOUS_STUDIES_FIELD, PF.background);
  return {
    academicLevel: normalizeAcademicLevel(fields[PF.lastAcademicLevel]), fieldOfStudy: lastField,
    diplomas: (fields[PF.obtainedDiplomas] || []).map(type => ({ type, fieldOfStudy: '', institutionType: '' })),
    engineeringRoute: '', gaps: [], otherGap: '', received: [], controls: [], notes: '',
  };
}

export function validateAdmissionProfile(input) {
  const invalid = message => { throw new Error(message); };
  const text = (value, max, label) => { if (typeof value !== 'string' || value.length > max) invalid(`${label} invalide.`); return value.trim(); };
  const keys = ['academicLevel', 'fieldOfStudy', 'diplomas', 'engineeringRoute', 'gaps', 'otherGap', 'received', 'controls', 'notes'];
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !keys.includes(key))) invalid('Questionnaire invalide.');
  if (!ACADEMIC_LEVELS.includes(input.academicLevel)) invalid('Choisissez un niveau académique valide.');
  if (!Array.isArray(input.diplomas) || !input.diplomas.length || input.diplomas.length > DIPLOMAS.length) invalid('Renseignez les diplômes obtenus.');
  const diplomas = input.diplomas.map(diploma => {
    if (!diploma || typeof diploma !== 'object' || Object.keys(diploma).some(key => !['type', 'fieldOfStudy', 'institutionType'].includes(key)) || !DIPLOMAS.some(option => option.id === diploma.type) || !['public', 'private'].includes(diploma.institutionType)) invalid('Précisez le diplôme et son établissement public ou privé.');
    const fieldOfStudy = text(diploma.fieldOfStudy, 300, 'Domaine du diplôme');
    if (!fieldOfStudy) invalid('Précisez le domaine étudié pour chaque diplôme.');
    return { type: diploma.type, fieldOfStudy, institutionType: diploma.institutionType };
  });
  if (new Set(diplomas.map(diploma => diploma.type)).size !== diplomas.length) invalid('Un diplôme ne peut figurer qu’une fois.');
  if (!['', 'prepa', 'licence'].includes(input.engineeringRoute) || diplomas.some(diploma => diploma.type === 'Engineering Degree') && !input.engineeringRoute) invalid('Précisez la voie du diplôme d’ingénieur.');
  const list = (value, allowed, label) => { if (!Array.isArray(value) || value.length > allowed.length || new Set(value).size !== value.length || value.some(id => !allowed.includes(id))) invalid(`${label} invalide.`); return value; };
  const profile = {
    academicLevel: input.academicLevel, fieldOfStudy: text(input.fieldOfStudy, 1000, 'Domaine général'), diplomas,
    engineeringRoute: diplomas.some(diploma => diploma.type === 'Engineering Degree') ? input.engineeringRoute : '',
    gaps: list(input.gaps, GAP_TYPES.map(gap => gap.id), 'Expérience'), otherGap: text(input.otherGap, 200, 'Autre justificatif'),
    controls: list(input.controls, CONSULTANT_CHECKS.map((_, index) => String(index)), 'Contrôle consultant'),
    notes: text(input.notes, 5000, 'Note'),
  };
  if (profile.gaps.includes('other') && !profile.otherGap) invalid('Précisez le libellé du justificatif « Autre ».');
  profile.received = list(input.received, buildAdmissionRequirements(profile).map(doc => doc.id), 'Documents reçus');
  return profile;
}
