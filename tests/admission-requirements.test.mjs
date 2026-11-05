import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_lib/admission-documents.js';
import { PF } from '../src/lib/config.js';
import { REQUESTED_DOCUMENTS_FIELD } from '../src/lib/admissionDocuments.js';
import { ADMISSION_REQUIREMENTS_FIELD as F, PREVIOUS_STUDIES_FIELD, buildAdmissionRequirements, validateAdmissionProfile } from '../src/lib/admissionRequirements.js';

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const env = { AIRTABLE_API_KEY: 'test', APP_ORIGIN: 'https://dashboard.example', NODE_ENV: 'production' };
const profile = (type = 'Bac', extra = {}) => ({ academicLevel: 'Bac accompli', fieldOfStudy: 'Sciences', diplomas: [{ type, fieldOfStudy: 'Sciences', institutionType: 'public' }], engineeringRoute: '', gaps: [], otherGap: '', received: [], controls: [], notes: '', ...extra });
const req = body => ({ method: body ? 'POST' : 'GET', url: '/api/admission-documents?studentId=recStudent&checklist=1', headers: { cookie: 'jeexpert_session=' + 'ab'.repeat(32), host: 'dashboard.example', origin: env.APP_ORIGIN }, ...(body ? { body: { action: 'save-checklist', studentId: 'recStudent', ...body } } : {}) });
const res = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
function mock({ role = 'Editor', fields = {}, failSave = false } = {}) {
  const record = { id: 'recStudent', fields: { [PF.lastAcademicLevel]: 'Bac accompli', [PF.obtainedDiplomas]: ['Bac'], [PREVIOUS_STUDIES_FIELD]: 'Sciences', [REQUESTED_DOCUMENTS_FIELD]: 'Existing custom requests', ...fields } };
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes('tblJ85bJE0loqwNvU')) return { ok: true, json: async () => ({ records: [{ id: 'recSession', fields: { user: ['recUser'], expires_at: new Date(Date.now() + 60000).toISOString() } }] }) };
    if (String(url).endsWith('/recUser')) return { ok: true, json: async () => ({ id: 'recUser', fields: { username: 'operator', display_name: 'Expert', is_active: true, role } }) };
    assert.ok(String(url).includes('/recStudent?returnFieldsByFieldId=true'));
    if (init.method === 'PATCH') {
      if (failSave) return { ok: false, status: 503 };
      const payload = JSON.parse(init.body); writes.push(payload.fields); Object.assign(record.fields, payload.fields);
    }
    return { ok: true, json: async () => structuredClone(record) };
  };
  return { record, writes };
}
async function call(body) { const response = res(); await handler(req(body), response, env); return response; }

test('five PDF cases include inherited documents and distinguish engineer routes', () => {
  for (const [type, extra, count] of [['Bac', {}, 9], ['Licence', {}, 14], ['Master', {}, 18], ['Engineering Degree', { engineeringRoute: 'licence' }, 18], ['Engineering Degree', { engineeringRoute: 'prepa' }, 16], ['PhD', {}, 20]]) {
    const documents = buildAdmissionRequirements(profile(type, extra));
    assert.equal(documents.length, count, type + JSON.stringify(extra));
    assert.equal(new Set(documents.map(doc => doc.id)).size, documents.length);
    assert.deepEqual(documents.filter(doc => doc.urgency === 'Urgent').map(doc => doc.id), ['photo', 'passport', 'cv']);
  }
  const ids = type => buildAdmissionRequirements(profile(type)).map(doc => doc.id);
  assert.ok(ids('Bac').includes('bac_tr_secondary'));
  assert.ok(!ids('Licence').includes('bac_tr_secondary'));
  assert.ok(ids('PhD').includes('plan_licence') && ids('PhD').includes('plan_master') && ids('PhD').includes('plan_doctorat'));
  const prepa = buildAdmissionRequirements(profile('Engineering Degree', { engineeringRoute: 'prepa' }));
  assert.ok(prepa.some(doc => doc.id === 'prepa_tr2') && prepa.some(doc => doc.id === 'eng_tr3'));
  assert.ok(!prepa.some(doc => doc.id === 'lic_dip'));
});

test('private diplomas receive individual equivalences; gaps follow actual answers without duplicate academic items', () => {
  const documents = buildAdmissionRequirements(profile('Master', {
    diplomas: ['Bac', 'Licence', 'Master'].map(type => ({ type, fieldOfStudy: 'Sciences', institutionType: type === 'Bac' ? 'public' : 'private' })),
    gaps: ['stage', 'work', 'training', 'other'], otherGap: 'Attestation de bénévolat',
  }));
  assert.deepEqual(documents.filter(doc => doc.category === 'private').map(doc => doc.id), ['equivalence:Licence', 'equivalence:Master']);
  assert.equal(documents.find(doc => doc.id === 'gap:other').name, 'Attestation de bénévolat');
  assert.equal(documents.filter(doc => doc.id === 'bac_dip').length, 1);
});

test('profile validation rejects incomplete institutions, duplicates, invented received documents and unknown values', () => {
  for (const invalid of [profile('Engineering Degree'), profile('Unknown'), profile('Bac', { diplomas: [{ type: 'Bac', fieldOfStudy: 'Sciences', institutionType: '' }] }), profile('Bac', { received: ['foreign'] }), profile('Bac', { gaps: ['other'] }), profile('Bac', { academicLevel: 'invented' }), profile('Bac', { diplomas: [...profile().diplomas, ...profile().diplomas] })]) assert.throws(() => validateAdmissionProfile(invalid));
  assert.equal(buildAdmissionRequirements(profile('BTS')).length, 7, 'Do not invent a BTS academic case absent from the PDF');
});

test('first load prefills existing Airtable answers; save and reload persist questionnaire, checklist and server attribution', async () => {
  const state = mock();
  const initial = await call(); assert.equal(initial.code, 200); assert.equal(initial.body.configured, false);
  assert.equal(initial.body.profile.academicLevel, 'Bac accompli'); assert.equal(initial.body.profile.diplomas[0].type, 'Bac');
  const answers = profile('Licence', { academicLevel: 'Bac +3 accompli (Licence)', diplomas: [{ type: 'Licence', fieldOfStudy: 'Informatique', institutionType: 'private' }], received: ['photo'], controls: ['0'], notes: 'Vérifier les scans' });
  const saved = await call({ profile: answers, expected: initial.body.expected });
  assert.equal(saved.code, 200); assert.equal(saved.body.configured, true);
  assert.equal(saved.body.updatedBy, 'Expert (operator)'); assert.ok(saved.body.documents.some(doc => doc.id === 'equivalence:Licence'));
  assert.deepEqual(Object.keys(state.writes[0]).sort(), [F, PF.lastAcademicLevel, PF.obtainedDiplomas, PREVIOUS_STUDIES_FIELD].sort());
  assert.equal(state.record.fields[REQUESTED_DOCUMENTS_FIELD], 'Existing custom requests');
  const reloaded = await call(); assert.deepEqual(reloaded.body.profile, saved.body.profile); assert.deepEqual(reloaded.body.documents, saved.body.documents);
  assert.deepEqual(JSON.parse(state.record.fields[F]).documents, saved.body.documents);
  assert.equal(state.record.fields[PF.lastAcademicLevel], 'Bac +3 (Licence)');
  state.record.fields[PF.lastAcademicLevel] = 'Bac +5 (Master / Ingénieur)';
  state.record.fields[PREVIOUS_STUDIES_FIELD] = 'Domaine modifié dans Proposal';
  const afterProposal = await call();
  assert.equal(afterProposal.body.profile.academicLevel, 'Bac +5 accompli (Master)');
  assert.equal(afterProposal.body.profile.fieldOfStudy, 'Domaine modifié dans Proposal');
});

test('concurrent questionnaire or existing academic changes reject stale saves', async () => {
  const state = mock(); const initial = await call();
  state.record.fields[PF.obtainedDiplomas] = ['Bac', 'Licence'];
  let response = await call({ profile: profile(), expected: initial.body.expected }); assert.equal(response.code, 409); assert.equal(state.writes.length, 0);
  const fresh = await call(); response = await call({ profile: profile(), expected: fresh.body.expected }); assert.equal(response.code, 200);
  response = await call({ profile: profile('Licence'), expected: fresh.body.expected }); assert.equal(response.code, 409); assert.equal(state.writes.length, 1);
});

test('View may read but cannot save; untrusted origins and arbitrary fields never mutate', async () => {
  let state = mock({ role: 'View' }); const initial = await call(); assert.equal(initial.code, 200);
  let response = await call({ profile: profile(), expected: initial.body.expected }); assert.equal(response.code, 403); assert.equal(state.writes.length, 0);
  state = mock();
  const request = req({ profile: profile(), expected: initial.body.expected }); request.headers.origin = 'https://evil.example'; response = res(); await handler(request, response, env); assert.equal(response.code, 403);
  response = await call({ profile: profile(), expected: initial.body.expected, fields: { other: 'bad' } }); assert.equal(response.code, 400); assert.equal(state.writes.length, 0);
  const anonymous = req(); anonymous.headers = {}; response = res(); await handler(anonymous, response, env); assert.equal(response.code, 401);
});

test('unconfirmed writes and incompatible saved data produce errors, not false success or data resets', async () => {
  let state = mock({ failSave: true }); const initial = await call();
  let response = await call({ profile: profile(), expected: initial.body.expected }); assert.equal(response.code, 503); assert.equal(state.record.fields[F], undefined);
  state = mock({ fields: { [F]: '{broken' } }); response = await call(); assert.equal(response.code, 409); assert.equal(state.writes.length, 0);
});
