// Display-only French labels for the backend's English enum values. The
// Airtable field values themselves (config.js) stay untouched — only what's
// rendered to the user goes through this mapping.

export const STATUS_LABELS_FR = {
  Todo: 'À faire',
  'In progress': 'En cours',
  Blocked: 'Bloquée',
  Done: 'Terminée',
  Archived: 'Archivée',
};

export const PRIORITY_LABELS_FR = {
  High: 'Haute',
  Medium: 'Moyenne',
  Low: 'Basse',
};

export const TYPE_LABELS_FR = {
  'Follow-up': 'Relance',
  'Document Request': 'Demande de document',
  'Call / Meeting': 'Appel / Réunion',
  Application: 'Candidature',
  Payment: 'Paiement',
  Visa: 'Visa',
  Other: 'Autre',
};

export function statusLabel(status) {
  return STATUS_LABELS_FR[status] || status;
}

export function priorityLabel(priority) {
  return PRIORITY_LABELS_FR[priority] || priority;
}

export function typeLabel(type) {
  return TYPE_LABELS_FR[type] || type;
}
