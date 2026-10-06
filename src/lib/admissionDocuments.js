// Document names mirror Forms admission-italy/buildDocList.ts.
export const ADMISSION_DOCUMENTS = [
  {
    "id": "photo",
    "name": "Photo d'identité",
    "category": "general"
  },
  {
    "id": "passport",
    "name": "Passeport",
    "category": "general"
  },
  {
    "id": "cv",
    "name": "CV",
    "category": "general"
  },
  {
    "id": "lang",
    "name": "Certificat de langue",
    "category": "general"
  },
  {
    "id": "ddv",
    "name": "Déclaration de valeur (ou CIMEA)",
    "category": "general"
  },
  {
    "id": "rec_1",
    "name": "Lettre de recommandation 1",
    "category": "general"
  },
  {
    "id": "rec_2",
    "name": "Lettre de recommandation 2",
    "category": "general"
  },
  {
    "id": "plan_licence",
    "name": "Plan d'études — Licence",
    "category": "academic"
  },
  {
    "id": "plan_master",
    "name": "Plan d'études — Master",
    "category": "academic"
  },
  {
    "id": "plan_doctorat",
    "name": "Plan d'études — Doctorat",
    "category": "academic"
  },
  {
    "id": "bac_dip",
    "name": "Diplôme du Baccalauréat",
    "category": "academic"
  },
  {
    "id": "bac_tr_secondary",
    "name": "Relevé de notes Bac — 3ème année secondaire",
    "category": "academic"
  },
  {
    "id": "bac_tr",
    "name": "Relevé de notes Bac",
    "category": "academic"
  },
  {
    "id": "lic_dip",
    "name": "Diplôme de Licence",
    "category": "academic"
  },
  {
    "id": "lic_tr1",
    "name": "Relevé de notes Licence — année 1",
    "category": "academic"
  },
  {
    "id": "lic_tr2",
    "name": "Relevé de notes Licence — année 2",
    "category": "academic"
  },
  {
    "id": "lic_tr3",
    "name": "Relevé de notes Licence — année 3",
    "category": "academic"
  },
  {
    "id": "mas_dip",
    "name": "Diplôme de Master / Ingénieur",
    "category": "academic"
  },
  {
    "id": "mas_tr1",
    "name": "Relevé de notes Master — année 1",
    "category": "academic"
  },
  {
    "id": "mas_tr2",
    "name": "Relevé de notes Master — année 2",
    "category": "academic"
  },
  {
    "id": "phd_dip",
    "name": "Diplôme de Doctorat / PhD",
    "category": "academic"
  },
  {
    "id": "gap_stage",
    "name": "Attestation de stage",
    "category": "experience"
  },
  {
    "id": "gap_work",
    "name": "Attestation de travail",
    "category": "experience"
  },
  {
    "id": "gap_training",
    "name": "Attestation de formation",
    "category": "experience"
  },
  {
    "id": "gap_other",
    "name": "Document justificatif",
    "category": "experience"
  }
];
ADMISSION_DOCUMENTS.push(
  { id: 'lang_en', name: "Certificat d'anglais", category: 'general' },
  { id: 'lang_it', name: "Certificat d'italien", category: 'general' },
);
export const REQUESTED_DOCUMENTS_FIELD = 'fld01awcmxCsnW1GS';
export function mergeRequestedDocuments(current, names) {
  const original = String(current || '');
  const existing = new Set(original.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
  const added = [...new Set(names)].filter(name => !existing.has(name));
  return added.length ? original + (original && !original.endsWith('\n') ? '\n' : '') + added.join('\n') : original;
}
