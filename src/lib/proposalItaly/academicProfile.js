export const ACADEMIC_LEVEL_OPTIONS = [
  { value: 'Pre Bac', label: 'Pre Bac' },
  { value: 'Bac (en cours)', label: 'Bac (en cours)' },
  { value: 'Bac accompli', label: 'Bac accompli' },
  { value: 'Bac +1', label: 'Bac +1' },
  { value: 'Bac +2 (BTS / BTP / DUT / équivalent)', label: 'Bac +2 (BTS/BTP/DUT)' },
  { value: 'Bac +3 (en cours)', label: 'Bac +3 (en cours)' },
  { value: 'Bac +3 accompli (Licence)', label: 'Bac +3 (Licence)' },
  { value: 'Bac +4 (en cours)', label: 'Bac +4 (en cours)' },
  { value: 'Bac +5 (en cours – Master)', label: 'Bac +5 (en cours)' },
  { value: 'Bac +5 accompli (Master)', label: 'Bac +5 (Master)' },
  { value: 'Bac +6+ (Doctorat / PhD)', label: 'Bac +6+ (PhD)' },
];

export const ACADEMIC_LEVEL_LABELS = {
  'Pre Bac': 'Bac non obtenu',
  'Bac (en cours)': 'Bac',
  'Bac accompli': 'Bac accompli',
  'Bac +1': 'Bac +1',
  'Bac +2 (BTS / BTP / DUT / équivalent)': 'Bac +2 ',
  'Bac +3 (en cours)': 'Bac +3 en cours',
  'Bac +3 accompli (Licence)': 'Bac +3 (Licence)',
  'Bac +4 (en cours)': 'Bac +4 en cours',
  'Bac +5 (en cours – Master)': 'Bac +5 en cours',
  'Bac +5 accompli (Master)': 'Bac +5 (Master / Ingénieur)',
  'Bac +6+ (Doctorat / PhD)': 'Bac +8 (Doctorat)',
};

export function normalizeAcademicLevel(raw) {
  const value = String(raw || '').trim().toLowerCase();
  const aliases = { master: 'Bac +5 accompli (Master)', bachelor: 'Bac +3 accompli (Licence)', 'high school': 'Bac accompli' };
  return ACADEMIC_LEVEL_OPTIONS.find(option => [option.value, ACADEMIC_LEVEL_LABELS[option.value]].some(label => label.trim().toLowerCase() === value))?.value || aliases[value] || '';
}

export function previousStudies(fields, fieldId, legacyFieldId) {
  if (Object.hasOwn(fields, fieldId)) return fields[fieldId] || '';
  const legacy = fields[legacyFieldId];
  return (Array.isArray(legacy) ? legacy[0] : legacy) || '';
}
