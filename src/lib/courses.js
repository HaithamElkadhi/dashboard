export const courseRecordId = /^rec[a-zA-Z0-9]{14}$/;
export const maxEmailCourses = 50;

const labels = {
  Triennale: 'Bachelor', Magistrale: 'Master', 'Ciclo unico': 'Cycle unique',
  'Magistrale a ciclo unico': 'Cycle unique', Equipollente: 'Diplôme équivalent',
  IT: 'Italien', EN: 'Anglais', FR: 'Français', DE: 'Allemand', ES: 'Espagnol', mu: 'Multilingue',
};
export const courseLabel = value => labels[value] ?? value;

export function readCourse(row) {
  const [id, italian, english, university, campus, degree, language, year, admission, method, teaching,
    delivery, code, discipline, level, area, partners, updated, rawUrl, duration, credits, fee, deadline, status] = row;
  let url;
  try {
    const parsed = new URL(rawUrl?.startsWith('www.') ? `https://${rawUrl}` : rawUrl);
    if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href;
  } catch { /* Some catalog rows have no course website. */ }
  return { id, italian, english, title: english || italian || 'Formation sans titre', university, campus,
    degree, language, year, admission, method, teaching, delivery, code, discipline, level, area, partners,
    updated, url, duration, credits, fee, deadline, status };
}

export function courseEmail(courses, name) {
  const entries = courses.map((course, index) => {
    const facts = [courseLabel(course.degree), courseLabel(course.language), course.campus].filter(Boolean).join(' · ');
    return [
      `${index + 1}. ${course.title}`, course.university, facts,
      course.fee && `Frais de candidature : ${course.fee}`,
      course.deadline && `Date limite de candidature : ${course.deadline}`, course.url,
    ].filter(Boolean).join('\n');
  });
  return [name ? `Bonjour ${name},` : 'Bonjour,', 'Voici votre sélection de formations en Italie.',
    ...entries, 'L’équipe JEEXPERT'].join('\n\n');
}
