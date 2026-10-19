import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMailingProposal, buildMailingInvoice } from '../api/_lib/mailingPdfDocuments.js';
import { normalizeProposalRecord } from '../src/lib/airtable.js';
import { FIN, PF } from '../src/lib/config.js';

function assertPdf(result) {
  const pdf = Buffer.from(result.content, 'base64').toString('latin1');
  assert.ok(pdf.startsWith('%PDF-'));
  assert.match(pdf, /Poppins/);
  assert.match(pdf, /\/FontFile2/);
  assert.ok(result.filename.endsWith('.pdf'));
}

test('proposal builds with local branded assets and does not invent a saved proposal date', async () => {
  const record = { id: 'recProposal', fields: { [PF.fullName]: 'Amal Test', [PF.email]: 'amal@example.com' } };
  assert.equal(normalizeProposalRecord(record).proposalDate, '');
  const result = await buildMailingProposal(record);
  assertPdf(result);
  assert.equal(result.filename, 'Jeexpert_Proposal_Amal-Test_recProposal.pdf');
});

test('invoice uses real payment fields and the selected student name', async () => {
  const payment = { id: 'recPayment', fields: {
    [FIN.reference]: 'PAY-123', [FIN.prospects]: ['recStudent'], [FIN.fullName]: ['Incorrect Lookup'],
    [FIN.amount]: '1300', [FIN.currency]: 'TND', [FIN.paymentDate]: '2026-10-19', [FIN.purpose]: ['Admission'],
  } };
  const student = { id: 'recStudent', fields: { [PF.fullName]: 'Amal Test', [PF.email]: 'amal@example.com' } };
  const result = await buildMailingInvoice(payment, student);
  assertPdf(result);
  assert.equal(result.filename, 'Jeexpert_Invoice_Amal-Test_PAY-123_2026-10-19.pdf');
});
