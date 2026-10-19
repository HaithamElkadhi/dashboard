import test from 'node:test';
import assert from 'node:assert/strict';
import { PF, FIN } from '../src/lib/config.js';
import { describeInvoices } from '../src/lib/mailingStudentAttachments.js';
import { renderMailText } from '../src/lib/mailing.js';
import { getInvoiceMailingVariables, SYSTEM_MAIL_TEMPLATES } from '../src/lib/mailingSystemTemplates.js';
import { getOnboardingDefaults, normalizeMailingStudent, renderOnboarding, validateOnboardingVariables } from '../src/lib/mailingSystemTemplates.js';

test('selected student resolves the subject and selected invoice supplies its description, amount and due date', () => {
  const student = normalizeMailingStudent({ id:'recStudent', fields:{ [PF.fullName]:'Amira Ben Salem' } });
  assert.equal(renderMailText(SYSTEM_MAIL_TEMPLATES[0].subject, student), 'Bienvenue chez JEEXPERT — Amira Ben Salem');
  const invoice = describeInvoices([{ id:'recPayment', fields:{ [FIN.prospects]:['recStudent'], [FIN.purpose]:['Admission', 'Visa'], [FIN.amount]:1250.5, [FIN.dueDate]:'2026-11-10' } }], { id:student.id })[0];
  assert.deepEqual(getInvoiceMailingVariables(invoice), { formule:'Admission, Visa', date_echeance:'2026-11-10', montant_a_payer:'1250.5' });
  assert.deepEqual(getInvoiceMailingVariables({ amount:0 }), { formule:'', date_echeance:'', montant_a_payer:'0' });
});

test('student variables use the stored names and services; multiple payments require selection', () => {
  const student = normalizeMailingStudent({ id: 'recStudent', fields: { [PF.fullName]: 'Mohamed Ali Ben Salem', [PF.name]: 'Mohamed Ali', [PF.surname]: 'Ben Salem', [PF.email]: 'student@example.com', [PF.selectedServices]: ['Admission', 'Visa'], [PF.paiementsLink]: ['recPayment', 'invalid'] } });
  assert.equal(student.firstName, 'Mohamed Ali'); assert.equal(student.lastName, 'Ben Salem');
  assert.deepEqual(student.paymentIds, ['recPayment']);
  const payment = { amount: '700', dueDate: '2026-10-30' };
  assert.deepEqual(getOnboardingDefaults(student, [payment]), { formule: 'Admission, Visa', date_echeance: '2026-10-30', montant_a_payer: '700' });
  assert.equal(getOnboardingDefaults(student, [payment, payment]).montant_a_payer, '');
  assert.equal(getOnboardingDefaults(student, []).date_echeance, '');
});

test('required onboarding variables reject invalid dates and amounts', () => {
  const value = { formule: 'Admission', date_echeance: '2026-10-30', montant_a_payer: '700,125' };
  assert.equal(validateOnboardingVariables(value).montant_a_payer, '700.125');
  for (const patch of [{ formule: '' }, { date_echeance: '2026-02-30' }, { montant_a_payer: '0' }, { montant_a_payer: '700.1234' }, { email_etudiant: 'forged@example.com' }]) assert.throws(() => validateOnboardingVariables({ ...value, ...patch }));
});

test('HTML keeps a fixed document checklist and a prominent portal link without dynamic filenames', () => {
  const source = { student: { firstName: 'Amira <script>', lastName: 'Ben & Salem', email: 'student@example.com' }, variables: { formule: '<img src=x>', date_echeance: '2026-10-30', montant_a_payer: '700' } };
  let rendered = renderOnboarding(source);
  assert.ok(!rendered.html.includes('Fichiers joints à cet envoi'));
  for (const document of ['Brochure JEEXPERT', 'Fiche étudiant', 'Règlement intérieur', 'Facture du premier paiement', 'Guide de la plateforme']) {
    assert.ok(rendered.html.includes(`<li>${document}</li>`)); assert.ok(rendered.text.includes(document));
  }
  assert.ok(rendered.html.includes('href="https://student.jeexpert.com"'));
  assert.ok(rendered.html.includes('text-decoration:underline;font-size:16px;">https://student.jeexpert.com</a>'));
  assert.ok(rendered.text.includes('https://student.jeexpert.com'));
  assert.ok(!rendered.html.includes('studant.jeexpert.com'));
  assert.ok(rendered.html.includes('Amira &lt;script&gt;'));
  assert.ok(!rendered.html.includes('<img src=x>'));
  assert.ok(!rendered.html.includes('{{'));
  assert.ok(rendered.html.includes('30/10/2026'));
  rendered = renderOnboarding({ ...source, attachments: [{ filename: 'Facture & guide.pdf' }] });
  assert.ok(!rendered.html.includes('Facture &amp; guide.pdf'));
  assert.ok(!rendered.text.includes('Facture & guide.pdf'));
  assert.ok(rendered.text.endsWith('Jeexpert Team - +393520880880'));
});
