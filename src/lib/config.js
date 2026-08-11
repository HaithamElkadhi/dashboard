export const BASE_ID = 'appkqvTuc8F0AhWPp';

export const TABLES = {
  prospects: 'tblQPh56AAmCe1bTj',
  paiements: 'tblT2XDNBcvOfA4kj',
  tasks: 'tblkmA6khmu06nmSb',
  leads: 'tblhSrpux7LntoFHA',
  accounts: 'tblEQbtTmVkMlTbUV',
};

// Prospects table field IDs
export const PF = {
  fullName: 'fld0Z5NgQnyUnPfpE',
  name: 'fldrjpZMHxXReuVBK',
  surname: 'fldrlBOVl9Rd2wIff',
  prospectId: 'fldy26xuJG1jxUrxL',
  situation: 'fldLY8mOVCDsJhw23',
  nbrApplications: 'fldWY2F7bmqqzRT7Q',
  admissionStatus: 'fldmuVhiN3wJyNNtF',
  applicationUniversity: 'fldvd6oYJD9xgpSD8',
  approvedUniversity: 'fld2RAtd2zTwGx9S6',
  scholarshipStatus: 'fldRU8b7hEa0FTz7D',
  visaStatus: 'fldlO31JxYb7tM9Li',
  paiementsLink: 'fldStoAPufN0Ux4JF',
  email: 'fldWBOtlmuPIXdsep',
  phone: 'fldx6RMeRYPWC9BV3',
  accountsLink: 'flddNBP0jC3rYtcF0',
};

// Accounts table field IDs (student portal credentials: Universitaly,
// Prenotami, application email, scholarship — linked to Prospects)
export const ACC = {
  mailUser: 'fld6GymQ8Gh6hQnwX',
  label: 'fldU8qYxw1o9pJaoF', // multipleSelects
  prospectLink: 'flduaQtpEJlr03ivQ',
  prospectId: 'fldGMRgRfdIugamCi', // lookup — read-only
  link: 'fld4kKOkH1VvqUfUk',
  password: 'fld18yBzVSD5BtP3y',
  delegation: 'fldWkYbkWPvTQiTNl', // singleSelect
};

// Fallback choices for Accounts.label / Accounts.delegation when the live
// schema fetch (fetchAccountSelectChoices) fails. Prefer the schema so
// new/renamed options in Airtable need no code change.
export const ACCOUNT_LABELS = ['Email Candidature', 'Universitaly', 'Prenotami', 'Bourse'];

export const ACCOUNT_LABEL_COLORS = {
  'Email Candidature': { bg: '#EBF2FC', text: '#246BCE' },
  Universitaly: { bg: '#E6FAF8', text: '#18A999' },
  Prenotami: { bg: '#FEF5E7', text: '#B4530A' },
  Bourse: { bg: '#F1EFE8', text: '#5F5E5A' },
};

export const DELEGATION_CHOICES = [
  'jeexpert.service@gmail.com',
  'jeexpert.etudiant.aa1@gmail.com',
  'jeexpert.etudiant.aa2@gmail.com',
];

// CAM situation badge colors (Engaged / Admitted / both) — distinct accents
// from the Tasks/Finance palettes above, per the CAM spec's design tokens.
export const CAM_SITUATION_COLORS = {
  Admitted: { bg: '#E6FAF8', text: '#18A999' },
  Engaged: { bg: '#EBF2FC', text: '#246BCE' },
  Both: { bg: '#FEF5E7', text: '#854F0B' },
};

// Paiements table field IDs
export const PAY = {
  paymentId: 'fldQlNU3kjqvzoU2y',
  prospectLink: 'fld1YE6eeDJPG0wHR',
  amount: 'fldT0d71Hb2BovtNe',
  currency: 'fldjJfDqfKn8UXXk2',
  status: 'fldlCsQTRymR9vWee',
};

// Paiements table — full field map (see FIN below for choices/colors)
export const FIN = {
  reference: 'fldQlNU3kjqvzoU2y', // formula — read-only
  prospects: 'fldE5eklvFyL7SCjH', // multipleRecordLinks
  fullName: 'fldfszLfQiVbeVxfR', // multipleLookupValues — read-only
  email: 'fldb8FA1RbCfSe5Ho', // multipleLookupValues — read-only
  prospectId: 'fld1YE6eeDJPG0wHR', // multipleLookupValues — read-only
  amount: 'fldT0d71Hb2BovtNe', // singleLineText (number stored as text)
  currency: 'fldjJfDqfKn8UXXk2', // singleSelect
  status: 'fldlCsQTRymR9vWee', // singleSelect
  purpose: 'fld9KboGTSzoziodS', // multipleSelects
  dueDate: 'fldGCAnWh8Yb1gnpA', // date
  paymentDate: 'fldKabgKdceocbDRc', // date
  paymentMethod: 'fldRXyV7ll1jgMwyW', // singleLineText
  comment: 'fldLxiPmfh0gFzpZw', // multilineText
  exemptionReason: 'fldW9VWGY1VRoqSD8', // multilineText
  billingAddress: 'fld2HUwf8StFqIMla', // singleLineText
  taxe: 'fld2FjNuBPE72mabR', // number — %
  commCommercial: 'fldyETVuONKctHcv9', // number
  soldeConfirme: 'fldGjfM3MpNouAaLG', // checkbox
  netARecevoir: 'fldr6wcVqyDJ1pjbi', // formula — read-only
  moezType: 'fldO83OakpBMtXe1C', // singleSelect: % | Fixe | Aucune
  moezValeur: 'fldcCDGBy8YWHlunt', // number
  commissionMoez: 'fldYB0p5eYj2nTSbd', // formula — read-only
  invoice: 'fldy0JFBVkYmOmZTT', // multipleAttachments
  proofOfPayment: 'fldLG0u4INznvhroy', // multipleAttachments
};

// Real Airtable choices for Paiements singleSelect fields (fetched from schema —
// the currency/status lists differ from generic assumptions: FR statuses, +GBP).
export const CURRENCIES = ['EUR', 'USD', 'TND', 'GBP'];

export const PAYMENT_STATUSES = ['À payer', 'Payé', 'Exonéré', 'En retard'];

export const MOEZ_TYPES = ['%', 'Fixe', 'Aucune'];

// Fallback only — useFinanceData fetches the live list from the Airtable
// schema (fetchPurposeChoices) so new/renamed Purpose options need no code
// change. This is used only if that schema read fails (e.g. missing PAT scope).
export const PURPOSE_CHOICES = [
  'Frais de service initial',
  "Frais d'acceptation université",
  'Frais dossier visa',
  'Frais de traduction',
  'Frais dossier documents',
  'Frais Prenotami',
  'Autres',
  'Frais dossier',
  'Frais université',
  'Frais visa',
  'Frais logement',
  'Frais scolarité',
  'Frais service',
  'Frais document',
  'Frais traduction',
  'Frais admin',
  'Frais divers',
];

export const PAYMENT_STATUS_COLORS = {
  'À payer': { bg: '#FAEEDA', text: '#854F0B' },
  Payé: { bg: '#EAF3DE', text: '#3B6D11' },
  Exonéré: { bg: '#EDE2FE', text: '#6B1CB0' },
  'En retard': { bg: '#FCEBEB', text: '#A32D2D' },
};

// Prospect Situation choices (ordered for the filter pills)
export const SITUATION_CHOICES = [
  'Undecided',
  'Last chance',
  'Potential',
  'Lost',
  'Admitted',
  'Engaged',
  'Serious',
  'Next Year',
  'Completed',
];

export const PAID_STATUS = 'Payé';
export const DUE_STATUS = 'À payer';

// Tasks table fields (Ticket ID is formula — read-only, never send on write)
// Title is stored in Description (the Name field was removed from Airtable).
export const TF = {
  status: 'Task Status',
  priority: 'Priority',
  type: 'Task Type',
  assignedTo: 'Assigned To',
  ddl: 'DDL',
  prospectName: 'Prospect Name',
  description: 'Description',
  notes: 'Notes',
  ticketId: 'Ticket ID',
};

// Picker fields on Prospects / Leads
export const PICKER = {
  prospectFullName: 'Full Name Native',
  prospectId: 'Prospect ID',
  leadFullName: 'Full Name',
};

// Board statuses (kanban columns + mobile tabs). Archived is deliberately not
// part of this list — it's a terminal state that should disappear from the
// active board rather than compete for space with live work.
export const TASK_STATUSES = ['Todo', 'In progress', 'Blocked', 'Done'];

export const ARCHIVED_STATUS = 'Archived';

// Full set, including Archived — used where a task must be movable to/from
// that state (the status chip picker in the edit form).
export const ALL_TASK_STATUSES = [...TASK_STATUSES, ARCHIVED_STATUS];

export const TASK_PRIORITIES = ['High', 'Medium', 'Low'];

export const TASK_TYPES = [
  'Follow-up',
  'Document Request',
  'Call / Meeting',
  'Application',
  'Payment',
  'Visa',
  'Other',
];

export const ASSIGNEES = ['Haitham', 'Eya', 'Moez'];

export const STATUS_COLORS = {
  Todo: { bg: '#F1EFE8', text: '#5F5E5A' },
  'In progress': { bg: '#E6F1FB', text: '#185FA5' },
  Blocked: { bg: '#FDE4D0', text: '#B4530A' },
  Done: { bg: '#EAF3DE', text: '#3B6D11' },
  Archived: { bg: '#EDEDED', text: '#6B6B66' },
};

export const PRIORITY_COLORS = {
  High: { bg: '#FCEBEB', text: '#A32D2D' },
  Medium: { bg: '#FAEEDA', text: '#854F0B' },
  Low: { bg: '#EAF3DE', text: '#3B6D11' },
};
