import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMIC_LEVEL_OPTIONS, ACADEMIC_LEVEL_LABELS, normalizeAcademicLevel } from '../src/lib/proposalItaly/academicProfile.js';
import { ACADEMIC_LEVELS, seedAdmissionProfile, PREVIOUS_STUDIES_FIELD } from '../src/lib/admissionRequirements.js';
import { normalizeProposalRecord, saveProposalToAirtable, fetchProspectCompleteness } from '../src/lib/airtable.js';
import { PF } from '../src/lib/config.js';

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test('Admission and Proposal normalize all shared academic levels through the same Airtable mappings', () => {
  assert.equal(ACADEMIC_LEVEL_OPTIONS.length, 11);
  assert.deepEqual(ACADEMIC_LEVELS, ACADEMIC_LEVEL_OPTIONS.map(option => option.value));
  for (const { value } of ACADEMIC_LEVEL_OPTIONS) {
    for (const raw of [value, ACADEMIC_LEVEL_LABELS[value]]) {
      const fields = { [PF.lastAcademicLevel]: raw };
      assert.equal(seedAdmissionProfile(fields).academicLevel, value);
      assert.equal(normalizeProposalRecord({ fields }).studentProfile.academicLevel, value);
    }
  }
  assert.equal(normalizeAcademicLevel('Master'), 'Bac +5 accompli (Master)');
  assert.equal(normalizeAcademicLevel('Autre'), '');
});

test('previous studies is a shared text field, independent of academic level, with legacy Background fallback', () => {
  assert.equal(PREVIOUS_STUDIES_FIELD, PF.previousStudies);
  for (const fields of [
    { [PF.lastAcademicLevel]: 'Bac +3 (Licence)', [PF.previousStudies]: 'Informatique et robotique', [PF.background]: ['Economics'] },
    { [PF.lastAcademicLevel]: 'Bac +3 (Licence)', [PF.background]: ['Civil Engineering', 'Other field'] },
  ]) {
    const proposal = normalizeProposalRecord({ fields }).studentProfile;
    const admission = seedAdmissionProfile(fields);
    assert.equal(proposal.fieldOfPreviousStudies, admission.fieldOfStudy);
    assert.equal(proposal.academicLevel, admission.academicLevel);
    assert.notEqual(proposal.fieldOfPreviousStudies, proposal.academicLevel);
  }
  const cleared = { [PF.previousStudies]: '', [PF.background]: ['Economics'] };
  assert.equal(normalizeProposalRecord({ fields: cleared }).studentProfile.fieldOfPreviousStudies, '');
  assert.equal(seedAdmissionProfile(cleared).fieldOfStudy, '');
});

test('Proposal writes arbitrary previous-study text to the same field Admission reads, without creating select options', async () => {
  let fields;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.method, 'PATCH'); fields = JSON.parse(init.body).fields;
    return { ok: true, json: async () => ({ id: 'recStudent', fields }) };
  };
  const data = { prospectRecordId: 'recStudent', studentName: 'Test Student', email: 'test@example.com', studentProfile: { academicLevel: 'Bac +3 accompli (Licence)', fieldOfPreviousStudies: 'Robotique et systèmes embarqués', obtainedDiploma: ['Bac', 'Licence'] } };
  await saveProposalToAirtable(data);
  assert.equal(fields[PF.previousStudies], 'Robotique et systèmes embarqués');
  assert.equal(fields[PF.background], undefined);
  assert.equal(fields[PF.lastAcademicLevel], 'Bac +3 (Licence)');
  assert.equal(seedAdmissionProfile(fields).fieldOfStudy, data.studentProfile.fieldOfPreviousStudies);
  data.studentProfile.fieldOfPreviousStudies = '';
  await saveProposalToAirtable(data);
  assert.equal(fields[PF.previousStudies], '');
  assert.deepEqual(fields[PF.background], [], 'Clearing the domain must not resurrect the legacy value');
});

test('Proposal completeness recognizes both the shared text field and historical Background', async () => {
  for (const fields of [{ [PF.previousStudies]: 'Robotique' }, { [PF.background]: ['Economics'] }, {}]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ fields }) });
    const completeness = await fetchProspectCompleteness('recStudent');
    assert.equal(completeness.missing.includes('Field of previous studies'), !Object.keys(fields).length);
  }
});
