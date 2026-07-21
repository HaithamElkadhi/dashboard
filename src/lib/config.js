export const BASE_ID = 'appkqvTuc8F0AhWPp';

export const TABLES = {
  prospects: 'tblQPh56AAmCe1bTj',
  paiements: 'tblT2XDNBcvOfA4kj',
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
};

// Paiements table field IDs
export const PAY = {
  paymentId: 'fldQlNU3kjqvzoU2y',
  prospectLink: 'fld1YE6eeDJPG0wHR',
  amount: 'fldT0d71Hb2BovtNe',
  currency: 'fldjJfDqfKn8UXXk2',
  status: 'fldlCsQTRymR9vWee',
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
