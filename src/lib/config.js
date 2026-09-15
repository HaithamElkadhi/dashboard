export const BASE_ID = 'appkqvTuc8F0AhWPp';

// Expenses live in a separate Airtable base from the rest of the dashboard.
export const EXPENSES_BASE_ID = 'app1DQrDYl29uN2OR';

export const TABLES = {
  prospects: 'tblQPh56AAmCe1bTj',
  paiements: 'tblT2XDNBcvOfA4kj',
  tasks: 'tblkmA6khmu06nmSb',
  leads: 'tblhSrpux7LntoFHA',
  accounts: 'tblEQbtTmVkMlTbUV',
  expenses: 'tblrpf0nxZNlNftME',
  bookings: 'tblYHIcXwoMupWnaC',
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
  visaAppointmentDate: 'fldFqV1HBszTl1XwD', // Airtable "Appointment Date"
  universitalyValidation: 'fldU8dwNM5CHnakCq', // Airtable "Account_Universitaly"
  scholarshipFolder: 'fldkFISclahSaCBOH', // Airtable "Scholarship Document Folder"
  scholarshipType: 'fld50RAsGJ0ceD7gH',
  scholarshipSubmissionDate: 'fldtJkT2buefXXRrK',
  scholarshipPayment: 'fldvaKgmQgNVwG5sF',
  scholarshipDDL: 'fldrXRWcTK3Dve4mu',
  regionAuthority: 'fld7692flEhPFJzz8',
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

// Expenses table field IDs (separate base — see EXPENSES_BASE_ID)
export const EXP = {
  description: 'fldlvufb9b8cuNOXs',
  amount: 'fldeWcFXyZP5uSfh5',
  currency: 'fldlc1aXTIDC4X7hU',
  date: 'fldTZ8Ny08g2ffOel',
  category: 'fld8FoRLshgTHpKGO',
  paymentMethod: 'fldi5wv7fPEoB5AOn',
  status: 'fldjp9iAnGRHq2ovb',
  paidBy: 'fldzpaJ6a4yk8Rx9c',
  notes: 'fld5VHvtyKPOmjfQV',
  invoice: 'fldUSVJ0wwNyRLLe8', // multipleAttachments
};

export const EXPENSE_CURRENCIES = ['EUR', 'USD', 'TND', 'GBP', 'CHF'];

export const EXPENSE_CATEGORIES = [
  'Salary',
  'Comission',
  'Application Fees',
  'Subscription',
  'Fourniture',
  'Marketing',
  'Management',
  'Comission Moez',
];

export const EXPENSE_PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Wise',
  'Revolut',
  'PayPal',
  'Tunisian Post Transaction',
  'Western Transaction',
  'Transaction from Anastasia bank account',
  'Transaction from Haitham bank account',
];

export const EXPENSE_STATUSES = ['Paid', 'Pending', 'Refunded'];

export const EXPENSE_STATUS_COLORS = {
  Paid: { bg: '#EAF3DE', text: '#3B6D11' },
  Pending: { bg: '#FAEEDA', text: '#854F0B' },
  Refunded: { bg: '#EBF2FC', text: '#185FA5' },
};

export const EXPENSE_CATEGORY_COLORS = {
  Salary: { bg: '#EBF2FC', text: '#246BCE' },
  Comission: { bg: '#EDE2FE', text: '#6B1CB0' },
  'Application Fees': { bg: '#FEF5E7', text: '#B4530A' },
  Subscription: { bg: '#E6FAF8', text: '#18A999' },
  Fourniture: { bg: '#F1EFE8', text: '#5F5E5A' },
  Marketing: { bg: '#FCEBEB', text: '#A32D2D' },
  Management: { bg: '#E6F1FB', text: '#185FA5' },
  'Comission Moez': { bg: '#FAEEDA', text: '#854F0B' },
};

// Booking table field IDs
export const BK = {
  name: 'fldSo7qi0ykq9hNRD',
  studentName: 'fldQVz4tlNW58I6Ip',
  email: 'fldasDMrcwqX9tVNp',
  phone: 'flduPE1kyhAPfjqTr',
  dateTime: 'fld3ZWw07FlWQz6xj',
  duration: 'fldT7aeHeWXrno7ya',
  meetingType: 'fldrAHy70gOEIVmH5',
  bookingStatus: 'fldZHQnFb6uOQ3pNg',
  linkedProspect: 'fldhR4N2XROZGK7Ha',
  meetingLink: 'fldQKPTf88j2oaQW2',
  notes: 'fldUHN2ZyV4xKUihD',
};

// Fallbacks when the live schema fetch fails — prefer schema-driven choices.
export const BOOKING_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'No-show'];

export const MEETING_TYPES = [
  'Consultation',
  'Follow-up',
  'Visa',
  'Application',
  'Other',
];

export const BOOKING_STATUS_COLORS = {
  // Bleu — rendez-vous planifié
  Scheduled: { bg: '#B8D4FF', text: '#0D47A1' },
  // Vert — consultation effectuée
  Completed: { bg: '#D1F7C4', text: '#1B5E20' },
  // Rouge — annulé
  Cancelled: { bg: '#FFC9D1', text: '#8B1538' },
  // Orange — absence / no-show
  'No-show': { bg: '#FFD6A8', text: '#8A3B00' },
};

/** Resolve badge colors for a booking status (case-insensitive). */
export function bookingStatusColor(status) {
  if (!status) return { bg: '#EEEEEE', text: '#5F5E5A' };
  const key = Object.keys(BOOKING_STATUS_COLORS).find(
    (k) => k.toLowerCase() === String(status).toLowerCase()
  );
  return key
    ? BOOKING_STATUS_COLORS[key]
    : { bg: '#EEEEEE', text: '#5F5E5A' };
}
