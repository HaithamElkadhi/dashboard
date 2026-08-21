import { DUE_STATUS } from './config.js';

/**
 * Paiements with status "À payer", soonest due date first.
 * Missing due dates sort last.
 */
export function pendingPaiements(paiements) {
  return paiements
    .filter((p) => p.status === DUE_STATUS)
    .slice()
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      if (a.dueDate < b.dueDate) return -1;
      if (a.dueDate > b.dueDate) return 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
}
