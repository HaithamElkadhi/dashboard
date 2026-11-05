import { createHash } from 'node:crypto';
import { authError } from './auth.js';
import { PF } from '../../src/lib/config.js';
import { ACADEMIC_LEVEL_LABELS, normalizeAcademicLevel, previousStudies } from '../../src/lib/proposalItaly/academicProfile.js';
import { ADMISSION_REQUIREMENTS_FIELD as F, PREVIOUS_STUDIES_FIELD, buildAdmissionRequirements, seedAdmissionProfile, validateAdmissionProfile } from '../../src/lib/admissionRequirements.js';

const pending = new Map();
const version = fields => createHash('sha256').update(JSON.stringify([F, PF.lastAcademicLevel, PF.obtainedDiplomas, PREVIOUS_STUDIES_FIELD, PF.background].map(key => fields[key] ?? null))).digest('hex');
function result(record) {
  const fields = record.fields || {};
  let saved = null;
  if (fields[F]) {
    try {
      saved = JSON.parse(fields[F]);
      if (saved.version !== 1) throw new Error();
      const academicLevel = normalizeAcademicLevel(fields[PF.lastAcademicLevel] || saved.profile.academicLevel);
      saved.profile = validateAdmissionProfile({ ...saved.profile, academicLevel: academicLevel || 'Pre Bac' });
      // Historical labels outside Proposal's list must be corrected by the user.
      saved.profile.academicLevel = academicLevel;
      saved.profile.fieldOfStudy = previousStudies(fields, PREVIOUS_STUDIES_FIELD, PF.background);
    } catch { throw authError(409, 'La checklist enregistrée est illisible ou utilise une version incompatible. Contactez un administrateur pour la vérifier.'); }
  }
  const profile = saved?.profile || seedAdmissionProfile(fields);
  return { configured: Boolean(saved), profile, documents: saved ? buildAdmissionRequirements(profile) : [], expected: version(fields), updatedAt: saved?.updatedAt || '', updatedBy: saved?.updatedBy || '' };
}

export async function admissionRequirements(req, res, { request, studentId, user }) {
  if (req.method === 'GET') return res.json(result(await request()));
  const body = req.body || {};
  if (Object.keys(body).some(key => !['action', 'studentId', 'profile', 'expected'].includes(key)) || !/^[a-f0-9]{64}$/.test(body.expected || '')) throw authError(400, 'Requête de checklist invalide.');
  let profile;
  try { profile = validateAdmissionProfile(body.profile); } catch (error) { throw authError(400, error.message); }
  const operation = (pending.get(studentId) || Promise.resolve()).catch(() => {}).then(async () => {
    const current = await request();
    if (version(current.fields || {}) !== body.expected) throw authError(409, 'Le parcours ou la checklist a changé. Fermez puis rouvrez Required document avant de réessayer.');
    const updatedAt = new Date().toISOString(), updatedBy = `${user.displayName} (${user.username})`;
    const fields = {
      [F]: JSON.stringify({ version: 1, profile, documents: buildAdmissionRequirements(profile), updatedAt, updatedBy }),
      [PF.lastAcademicLevel]: ACADEMIC_LEVEL_LABELS[profile.academicLevel],
      [PF.obtainedDiplomas]: profile.diplomas.map(diploma => diploma.type),
      [PREVIOUS_STUDIES_FIELD]: profile.fieldOfStudy,
      ...(!profile.fieldOfStudy ? { [PF.background]: [] } : {}),
    };
    const saved = await request('PATCH', fields);
    return result(saved);
  });
  pending.set(studentId, operation);
  try { return res.json(await operation); } finally { if (pending.get(studentId) === operation) pending.delete(studentId); }
}
