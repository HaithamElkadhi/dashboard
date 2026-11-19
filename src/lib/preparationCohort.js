import { readPreparationMeeting } from './preparationMeeting.js';
import { PF } from './config.js';
import { normalizeIntake } from './schoolYears.js';
import { ADMISSION_REQUIREMENTS_FIELD } from './admissionRequirements.js';
import { readPreparationTest } from './preparationTest.js';
import { readPreparationDv } from './preparationDv.js';
import { readPreparationDeposit } from './preparationDeposit.js';

export const INTAKE_FIELD = 'fldWgAo9MCS0PQ0Qb';
export const MOUSAD9A_FIELD = 'fld2YHuug3Idlz1zb';
export const TRANSLATION_FIELD = 'fldc3wGaASfUESuQP';
export const NO_YEAR = '__none__';
export const preparationStages = [
  { key: 'identity', label: 'Identifiants' },
  { key: 'meeting', label: 'Preparation meeting' },
  { key: 'documents', label: 'Liste des documents' },
  { key: 'mousad9a', label: 'Mousad9a' },
  { key: 'translation', label: 'Traduction' },
  { key: 'test', label: 'Test de langue ou d’admission' },
  { key: 'dv', label: 'Déclaration de valeur ou CIMEA' },
  { key: 'deposit', label: 'Dépôt du dossier' },
];

export function schoolYears(fields) {
  const value = fields[INTAKE_FIELD];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(normalizeIntake).filter(Boolean))];
}

export function isCandidate(fields) {
  return Array.isArray(fields[PF.situation]) && fields[PF.situation].includes('Candidate');
}

export function matchesSchoolYear(fields, year) {
  const years = schoolYears(fields);
  return year === 'all' || (year === NO_YEAR ? years.length === 0 : years.includes(year));
}

export function preparationStats(records) {
  const stats = preparationStages.map(stage => ({ ...stage, done: 0, total: records.length, hidden: 0, unknown: 0 }));
  for (const { fields } of records) {
    const email = String(fields[PF.applicationEmail] || '').trim();
    if (/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) stats[0].done++;
    if (readPreparationMeeting(fields).done) stats[1].done++;
    if (fields[ADMISSION_REQUIREMENTS_FIELD]) {
      try {
        const saved = JSON.parse(fields[ADMISSION_REQUIREMENTS_FIELD]);
        if (saved.version !== 1 || !saved.profile || !Array.isArray(saved.documents)) throw new Error();
        if (saved.documents.length > 0) stats[2].done++;
      } catch { stats[2].unknown++; }
    }
    if (fields[MOUSAD9A_FIELD] === true) stats[3].done++;
    if (fields[TRANSLATION_FIELD] === true) stats[4].done++;
    const test = readPreparationTest(fields);
    if (test.type === 'Cacher') { stats[5].hidden++; stats[5].total--; }
    else if (test.done && ['IELTS ou équivalent', 'CISIA ou équivalent', 'EF Test'].includes(test.type)) stats[5].done++;
    if (['Rendez-vous pris', 'Fait'].includes(readPreparationDv(fields).status)) stats[6].done++;
    if (readPreparationDeposit(fields).done) stats[7].done++;
  }
  return stats.map(stat => ({ ...stat, percent: stat.total ? Math.round(stat.done * 100 / stat.total) : 0 }));
}
