import { readFile } from 'node:fs/promises';
import { ONBOARDING_DEFAULT_ATTACHMENTS } from '../../src/lib/mailingAttachments.js';

export async function readDefaultMailingAttachment(reference) {
  const descriptor = ONBOARDING_DEFAULT_ATTACHMENTS.find(file => file.systemFile === reference.systemFile);
  if (!descriptor || descriptor.filename !== reference.filename) throw new Error('Pièce jointe système inconnue.');
  const file = await readFile(new URL(`./mailing-defaults/${descriptor.systemFile}.pdf`, import.meta.url));
  if (file.length !== descriptor.size || file.subarray(0, 5).toString() !== '%PDF-') throw new Error('Pièce jointe système indisponible ou invalide.');
  return { filename: descriptor.filename, content: file.toString('base64') };
}
