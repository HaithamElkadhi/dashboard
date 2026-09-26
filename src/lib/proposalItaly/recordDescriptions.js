// Text summaries of the academic / language records, written to the Prospect
// long-text fields "Academic record description" and "Language record
// description". Same format as the forms project (/italy) so prospects look
// identical in Airtable whichever tool created them.

/** "Bac: 15/20 (GPA: 3.00)" — one line per diploma. */
export function buildAcademicDescription(records) {
  if (!Array.isArray(records)) return '';
  return records
    .filter((r) => r?.diploma)
    .map((r) => {
      const score = r.score ? `${r.score}/${r.maxScore || 20}` : '—';
      const gpa =
        r.score && r.maxScore
          ? ` (GPA: ${((Number(r.score) / Number(r.maxScore)) * 4).toFixed(2)})`
          : '';
      return `${r.diploma}: ${score}${gpa}`;
    })
    .join('\n');
}

/** "English: B2 (IELTS)" — one line per language, certificate "None" hidden. */
export function buildLanguageDescription(records) {
  if (!Array.isArray(records)) return '';
  return records
    .filter((r) => r?.language)
    .map((r) => {
      const level = r.level || '—';
      const cert = r.certificate && r.certificate !== 'None' ? ` (${r.certificate})` : '';
      return `${r.language}: ${level}${cert}`;
    })
    .join('\n');
}

// ─── Reverse: description text → records (to refill the form from Airtable) ──

/** "Bac: 15/20 (GPA: 3.00)" → [{ diploma: 'Bac', score: '15', maxScore: '20' }] */
export function parseAcademicDescription(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.match(/^\s*([^:]+?)\s*:\s*(?:([\d.,]+)\s*\/\s*([\d.,]+))?/))
    .filter(Boolean)
    .map(([, diploma, score = '', maxScore = '']) => ({
      diploma,
      score: score.replace(',', '.'),
      maxScore: maxScore.replace(',', '.'),
    }));
}

/** "English: B2 (IELTS)" → [{ language: 'English', level: 'B2', certificate: 'IELTS' }] */
export function parseLanguageDescription(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.match(/^\s*([^:]+?)\s*:\s*([^(]*?)\s*(?:\(([^)]*)\))?\s*$/))
    .filter(Boolean)
    .map(([, language, level = '', certificate = '']) => ({
      language,
      level: level === '—' ? '' : level,
      certificate,
    }));
}
