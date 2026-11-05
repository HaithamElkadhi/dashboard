import test from 'node:test';
import assert from 'node:assert/strict';
import { availableRequiredDocuments } from '../src/lib/documentSuggestions.js';

const required = [{ id: 'photo', name: 'Photo d’identité' }, { id: 'passport', name: 'Passeport (vérifier la date d’expiration)' }, { id: 'cv', name: 'CV' }];
test('uploaded required documents disappear, including normalized names and passport reminder', () => {
  const existing = [{ source: 'Academic', name: "Photo d'identite.pdf", files: [{ id: 'attPhoto' }] }, { source: 'Academic', name: ' PASSEPORT ', files: [{ id: 'attPassport' }] }];
  assert.deepEqual(availableRequiredDocuments(required, existing).map(doc => doc.id), ['cv']);
});
test('unuploaded requests, custom names and other sections do not hide missing admission documents', () => {
  const existing = [{ source: 'Academic', name: 'CV', files: [] }, { source: 'Visa', name: 'Passeport', files: [{ id: 'attVisa' }] }, { source: 'Academic', name: 'Custom document', files: [{ id: 'attOther' }] }];
  assert.deepEqual(availableRequiredDocuments(required, existing), required);
});
test('deleting an uploaded document makes its suggestion available again', () => {
  const existing = [{ source: 'Academic', name: 'CV', files: [{ id: 'attCV' }] }];
  assert.equal(availableRequiredDocuments(required, existing).length, 2);
  assert.equal(availableRequiredDocuments(required, []).length, 3);
});
