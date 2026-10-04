import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisaChecklistPdf } from '../src/lib/visaChecklistPdf.js';

test('PDF omits hidden documents and empty groups while exporting personal notes', () => {
  const doc = buildVisaChecklistPdf([
    { title: 'Visible section', items: [{ id: 'a', title: 'Passport', sub: 'Bring a copy', tags: ['opt'] }, { id: 'b', title: 'HIDDEN DOCUMENT' }] },
    { title: 'HIDDEN SECTION', items: [{ id: 'c', title: 'HIDDEN CONTENT' }] },
  ], { a: true }, { a: { note: 'PERSONAL NOTE' }, b: { hidden: true, note: 'SECRET NOTE' }, c: { hidden: true } });
  const output = doc.output();
  assert.match(output, /Passport/);
  assert.match(output, /PERSONAL NOTE/);
  assert.match(output, /Optionnel/);
  assert.doesNotMatch(output, /HIDDEN|SECRET NOTE/);
});

test('long notes survive multipage exports through the final line', () => {
  const note = `${'Important supporting explanation. '.repeat(600)}END OF LONG NOTE`;
  const doc = buildVisaChecklistPdf([{ title: 'Long notes', items: [{ id: 'a', title: 'Passport' }, { id: 'b', title: 'LAST DOCUMENT' }] }], {}, { a: { note } });
  assert.ok(doc.getNumberOfPages() > 1);
  assert.match(doc.output(), /END OF LONG NOTE/);
  assert.match(doc.output(), /LAST DOCUMENT/);
});

test('empty checklist generates a valid explanatory single page', () => {
  const doc = buildVisaChecklistPdf([{ title: 'Hidden', items: [{ id: 'a', title: 'Hidden document' }] }], {}, { a: { hidden: true } });
  assert.equal(doc.getNumberOfPages(), 1);
  assert.match(doc.output(), /Aucun document/);
});

test('unsupported note characters are reported instead of silently discarded', () => {
  assert.throws(() => buildVisaChecklistPdf([{ title: 'Notes', items: [{ id: 'a', title: 'Passport' }] }], {}, { a: { note: 'وثيقة' } }), /caractères latins/);
});
