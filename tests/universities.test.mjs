import assert from 'node:assert/strict';
import test from 'node:test';
import { loadUniversities } from '../api/_lib/universities.js';
import { admissionStatus, parseAdmissionDate, safeUniversityUrl, universitySearchKey } from '../src/lib/universities.js';

test('loads all directory pages and joins each session by linked record ID', async (t) => {
  const a = 'recAAAAAAAAAAAAAA';
  const b = 'recBBBBBBBBBBBBBB';
  const missing = 'recCCCCCCCCCCCCCC';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    const request = new URL(url);
    calls.push(request);
    assert.equal(request.searchParams.get('returnFieldsByFieldId'), 'true');
    if (request.pathname.endsWith('/tblIFAWo1BkhmssDO')) {
      return Response.json(request.searchParams.has('offset') ? {
        records: [{ id: 'empty', fields: { fldl5u5qmzaNbg3pi: 'Sans session' } }],
      } : {
        records: [{ id: 'linked', fields: { fldl5u5qmzaNbg3pi: 'Université', fldVVobFmXVT94ByV: [a, missing, b] } }],
        offset: 'next/page',
      });
    }
    return Response.json({ records: [
      { id: b, fields: { fldMwJWPiPlrjRPo0: 'Session B', fldlExjwBsI6Hz859: '€20', fldAHWw4DrrZNHPyf: 'Dec 10, 2026' } },
      { id: a, fields: { fldMwJWPiPlrjRPo0: 'Session A', fld3zaIH27AgnAgC9: 'Nov 11, 2026', fldNmal4d83cU1kLi: 'Historique A' } },
    ] });
  });

  const [linked, empty] = await loadUniversities('test-token');
  assert.equal(calls[1].searchParams.get('offset'), 'next/page');
  assert.equal(calls[2].searchParams.get('filterByFormula'), `OR(RECORD_ID()='${a}',RECORD_ID()='${missing}',RECORD_ID()='${b}')`);
  assert.deepEqual(empty.sessions, []);
  assert.deepEqual(linked.sessions.map(session => [session.id, session.opening, session.fees, session.history]), [
    [a, 'Nov 11, 2026', undefined, 'Historique A'],
    [missing, undefined, undefined, undefined],
    [b, undefined, '€20', undefined],
  ]);
  assert.equal(linked.sessions[1].missing, true);
});

test('classifies published admission dates and statuses using calendar days in Tunis', () => {
  const now = new Date('2026-11-09T23:30:00Z');
  const session = { opening: 'Nov 10, 2026', deadline: '10 Dec 2026' };
  assert.equal(admissionStatus(session, now).open, true);
  assert.equal(admissionStatus(session, now).deadlines, true);
  assert.equal(admissionStatus({ ...session, opening: 'Nov 15. 2026' }, now).soon, true);
  assert.equal(admissionStatus({ ...session, deadline: 'Dec 11, 2026' }, now).deadlines, false);
  assert.deepEqual(admissionStatus({ ...session, deadline: 'Nov 9, 2026' }, now), {});
  assert.equal(admissionStatus({ opening: 'Nov 15. 2026' }, now).soon, true);
  assert.equal(admissionStatus({ opening: 'Nov 9, 2026' }, now).open, false);
  assert.equal(admissionStatus({ ...session, deadline: '', notes: 'Blog :  ; statut publié : Open' }, now).open, true);
  assert.equal(admissionStatus({ opening: 'Nov 8, 2026', deadline: 'Nov 9, 2026', notes: 'Blog :  ; statut publié : Open' }, now).closed, true);
  assert.equal(admissionStatus({ opening: 'Nov 11, 2026', notes: 'Blog :  ; statut publié : Open' }, now).open, false);
  assert.ok(Object.values(admissionStatus({}, now)).every(value => !value));
  for (const value of ['3 Apr', 'May', 'Feb 30, 2027', '12–18 Nov 2026', '2026-13-01', '2026-11-10 (estimé)']) {
    assert.equal(parseAdmissionDate(value), null, value);
  }
});

test('search ignores accents and published links are limited to HTTP(S)', () => {
  assert.equal(universitySearchKey('  Università '), 'universita');
  assert.equal(safeUniversityUrl('javascript:alert(1)'), null);
  assert.equal(safeUniversityUrl('https://apply.example.edu/'), 'https://apply.example.edu/');
});
