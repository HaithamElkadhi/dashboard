const doc = (id, name, urgent = false) => ({ id, name, urgent });
export const commonDocuments = [
  doc('photo', 'Photo d’identité', true), doc('passport', 'Passeport', true), doc('cv', 'CV', true),
  doc('language', 'Certificat de langue (anglais ou italien)'), doc('value', 'Déclaration de valeur ou CIMEA'),
  doc('recommendation1', 'Lettre de recommandation 1'), doc('recommendation2', 'Lettre de recommandation 2'),
];
const bac = [doc('bac', 'Diplôme du Baccalauréat'), doc('bacNotes', 'Relevé de notes Bac')];
const licence = [...bac, doc('licence', 'Diplôme de Licence'), ...[1, 2, 3].map(n => doc(`licence${n}`, `Relevé de notes Licence - année ${n}`)), doc('planLicence', 'Plan d’études - Licence')];
const master = [...licence, doc('master', 'Diplôme de Master / Ingénieur'), ...[1, 2].map(n => doc(`master${n}`, `Relevé de notes Master - année ${n}`)), doc('planMaster', 'Plan d’études - Master')];
export const academicPaths = [
  { id: 'bac', name: 'Baccalauréat uniquement', documents: [bac[0], doc('secondary', 'Relevé de notes Bac - 3ème année secondaire')] },
  { id: 'licence', name: 'Licence (Bachelor’s)', documents: licence },
  { id: 'master', name: 'Master / Ingénieur (Licence → Master)', documents: master },
  { id: 'engineer', name: 'Ingénieur (Prépa → Cycle ingénieur)', documents: [...bac, ...[1, 2].map(n => doc(`prepa${n}`, `Relevé de notes Prépa - année ${n}`)), ...[1, 2, 3].map(n => doc(`engineer${n}`, `Relevé de notes Cycle Ingénieur - année ${n}`)), doc('engineerDiploma', 'Diplôme d’Ingénieur'), doc('planEngineer', 'Plan d’études - Ingénieur')] },
  { id: 'phd', name: 'Doctorat / PhD', documents: [...master, doc('phd', 'Diplôme de Doctorat / PhD'), doc('planPhd', 'Plan d’études - Doctorat')] },
];
export const experienceDocuments = [doc('internship', 'Stage - attestation de stage'), doc('work', 'Travail - attestation de travail'), doc('training', 'Formation - attestation de formation'), doc('other', 'Autre - document justificatif')];
export const consultantChecks = ['Identifier le cas de figure académique applicable', 'Demander en priorité les documents urgents', 'Vérifier la lisibilité et la cohérence des pièces reçues', 'Vérifier les exigences propres à chaque université'];
