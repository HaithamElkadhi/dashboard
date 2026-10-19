import { PF } from './config.js';
import { ONBOARDING_HTML } from './mailingTemplates/onboardingHtml.js';
import { ONBOARDING_DEFAULT_ATTACHMENTS } from './mailingAttachments.js';

export const ONBOARDING_TEMPLATE_ID = 'system-onboarding';
const ONBOARDING_TEXT = `Bonjour {{prenom_etudiant}} {{nom_etudiant}},

Bienvenue chez JEEXPERT ! Nous sommes heureux de vous accompagner dans votre projet d’études en Italie.
Selon votre formule, notre équipe vous guide pour l’admission universitaire, la bourse, le visa et l’intégration.

VOTRE PREMIER PAIEMENT
Formule : {{formule}}
Échéance : {{date_echeance}}
Montant à payer : {{montant_a_payer}} DT

Votre dossier sera activé après confirmation du premier paiement. Un manager dédié assurera ensuite le suivi de vos démarches.

DOCUMENTS JOINTS
- Brochure JEEXPERT
- Fiche étudiant
- Règlement intérieur
- Facture du premier paiement
- Guide de la plateforme

Merci de consulter ces documents, vérifier vos informations et effectuer votre paiement selon les instructions de la facture.

Votre espace étudiant : https://student.jeexpert.com
Connectez-vous avec votre adresse e-mail : {{email_etudiant}}
WhatsApp Tunisie : https://wa.me/21650511915
Prendre rendez-vous : https://book.jeexpert.com/

Merci pour votre confiance.
L’équipe JEEXPERT
contact@jeexpert-study.com · https://www.jeexpert-study.com
WhatsApp Italie : +39 352 088 0880
Bureau Tunisie : Bureau 3/4, 11 Avenue Habib Thameur, 1000 Tunis
Jeexpert Team - +393520880880`;
export const SYSTEM_MAIL_TEMPLATES = Object.freeze([Object.freeze({
  id: ONBOARDING_TEMPLATE_ID, system: true, name: 'Bienvenue / Onboarding JEEXPERT',
  subject: 'Bienvenue chez JEEXPERT — {{fullName}}', body: ONBOARDING_TEXT, cc: '', fromKey: 'contact', attachments: ONBOARDING_DEFAULT_ATTACHMENTS,
})]);

export function normalizeMailingStudent(record) {
  const fields = record.fields || {};
  const fullName = String(fields[PF.fullName] || [fields[PF.name], fields[PF.surname]].filter(Boolean).join(' ')).trim();
  const firstName = String(fields[PF.name] || fullName.split(/\s+/)[0] || '').trim();
  return {
    id: record.id, fullName,
    firstName,
    lastName: String(fields[PF.surname] || (fullName.startsWith(`${firstName} `) ? fullName.slice(firstName.length).trim() : '')).trim(),
    email: String(fields[PF.email] || '').trim(),
    formula: Array.isArray(fields[PF.selectedServices]) ? fields[PF.selectedServices].join(', ') : String(fields[PF.selectedServices] || ''),
    paymentIds: Array.isArray(fields[PF.paiementsLink]) ? fields[PF.paiementsLink].filter(id => /^rec[A-Za-z0-9]+$/.test(id)) : [],
  };
}

export function getOnboardingDefaults(student, payments = []) {
  const payment = payments.length === 1 ? payments[0] : null;
  return { formule: student?.formula || '', date_echeance: payment?.dueDate || '', montant_a_payer: payment ? String(payment.amount) : '' };
}

export function getInvoiceMailingVariables(invoice) {
  return { formule: invoice?.description || '', date_echeance: invoice?.dueDate || '', montant_a_payer: invoice?.amount == null ? '' : String(invoice.amount) };
}

export function validateOnboardingVariables(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['formule', 'date_echeance', 'montant_a_payer'].includes(key))) throw new Error('Variables du mail de bienvenue invalides.');
  if (typeof value.formule !== 'string' || !value.formule.trim() || value.formule.length > 1000) throw new Error('Complétez la formule de l’étudiant.');
  if (typeof value.date_echeance !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date_echeance) || !Number.isFinite(Date.parse(value.date_echeance)) || new Date(value.date_echeance).toISOString().slice(0,10) !== value.date_echeance) throw new Error('Complétez une date d’échéance valide.');
  const amount = typeof value.montant_a_payer === 'string' ? value.montant_a_payer.trim().replace(/\s/g, '').replace(',', '.') : '';
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(amount) || Number(amount) <= 0) throw new Error('Complétez un montant à payer positif en DT (3 décimales maximum).');
  return { formule: value.formule.trim(), date_echeance: value.date_echeance, montant_a_payer: amount };
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export function renderOnboarding({ student = {}, variables = {}, logoSrc = 'cid:jeexpert-logo' }) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(variables.date_echeance || '') ? variables.date_echeance.split('-').reverse().join('/') : 'À compléter';
  const amount = String(variables.montant_a_payer || '').replace(/\s/g, '').replace(',', '.');
  const values = {
    prenom_etudiant: student.firstName || student.fullName || 'Étudiant', nom_etudiant: student.lastName || '',
    email_etudiant: student.email || 'À compléter', formule: variables.formule || 'À compléter', date_echeance: date,
    montant_a_payer: amount && Number.isFinite(Number(amount)) ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(amount)) : 'À compléter',
  };
  const replace = (source, html) => source.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => html ? escapeHtml(values[key] ?? '') : values[key] ?? '');
  return {
    html: replace(ONBOARDING_HTML, true).replace('cid:jeexpert-logo', escapeHtml(logoSrc)),
    text: replace(ONBOARDING_TEXT, false), variables: values,
  };
}
