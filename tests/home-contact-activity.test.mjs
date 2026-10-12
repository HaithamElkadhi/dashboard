import test from 'node:test';
import assert from 'node:assert/strict';
import { homeContactActivity } from '../src/lib/homeContactActivity.js';

test('home combines manual and platform activity for every student, newest first', () => {
  const students = [
    { id: 'recOne', fullName: 'First student', contactHistory: '08/10/2026 — Appel de suivi',
      activity: [{ key: 'email:one', kind: 'email', at: '2026-10-09T10:00:00Z', title: 'Email sent', href: '/students/recOne/documents' }] },
    { id: 'recTwo', fullName: 'Second student', contactHistory: '09/10/2026 — WhatsApp', activity: [] },
  ];
  const before = structuredClone(students);
  const rows = homeContactActivity(students);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.studentId), ['recOne', 'recTwo', 'recOne']);
  assert.equal(rows[0].href, '/students/recOne/documents');
  assert.equal(rows[1].studentHref, '/prospects?open=recTwo');
  assert.equal(rows[1].title, 'WhatsApp');
  assert.deepEqual(students, before);
});
test('duplicate platform events are collapsed per student, not across students', () => {
  const event = { key: 'shared', at: '2026-10-09', kind: 'ticket', title: 'Shared ticket' };
  const rows = homeContactActivity([{ id: 'recOne', activity: [event, event] }, { id: 'recTwo', activity: [event] }]);
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((row) => row.key)).size, 2);
});
test('undated history remains visible; last-contact fallback avoids duplicating a history', () => {
  const rows = homeContactActivity([
    { id: 'recOne', contactHistory: 'Legacy contact text', manualLastContact: '2026-10-08' },
    { id: 'recTwo', manualLastContact: '2026-10-09', activity: [] },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].studentId, 'recTwo');
  assert.equal(rows[1].title, 'Legacy contact text');
  assert.equal(rows[1].at, '');
});
test('students without contact activity do not create fictional entries', () => {
  assert.deepEqual(homeContactActivity([{ id: 'recOne' }]), []);
});

test('prospection calls appear without matching students and sort with existing activity', () => {
  const call = { key: 'prospection:recCall', kind: 'prospection', studentName: 'Lead Test', at: '2026-10-12T12:00:00Z', title: 'WhatsApp : Suivi', by: 'Agent', href: '/operations/prospection?lead=recLead' };
  const rows = homeContactActivity([{ id: 'recStudent', manualLastContact: '2026-10-10' }], [call, call]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].studentName, 'Lead Test');
  assert.equal(rows[0].by, 'Agent');
  assert.equal(rows[0].href, '/operations/prospection?lead=recLead');
});
