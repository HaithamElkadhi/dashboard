import { MEETING_FIELDS } from '../../src/lib/preparationMeeting.js';
import { requireUser, authError, sendAuthError } from './auth.js';
import { BASE_ID, TABLES, PF } from '../../src/lib/config.js';
import { ADMISSION_REQUIREMENTS_FIELD } from '../../src/lib/admissionRequirements.js';
import { TEST_FIELDS } from '../../src/lib/preparationTest.js';
import { DV_FIELDS } from '../../src/lib/preparationDv.js';
import { DEPOSIT_FIELDS } from '../../src/lib/preparationDeposit.js';
import { accountQueries, LINKED_ACCOUNTS_FIELD } from '../../src/lib/preparationIdentity.js';
import { INTAKE_FIELD, MOUSAD9A_FIELD, TRANSLATION_FIELD, NO_YEAR, schoolYears, isCandidate, matchesSchoolYear, preparationStats } from '../../src/lib/preparationCohort.js';

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await requireUser(req, env);
    if (req.method !== 'GET') throw authError(405, 'Méthode non autorisée.');
    const params = new URL(req.url, 'http://internal').searchParams;
    const mode = params.get('mode') || 'list';
    const year = params.get('year') || '';
    if (!['years', 'list'].includes(mode) || (mode === 'list' && !['all', NO_YEAR].includes(year) && !/^\d{4}\/\d{4}$/.test(year))) {
      throw authError(400, 'Sélectionnez une année scolaire valide.');
    }
    const filters = [`FIND(',Candidate,', ',' & ARRAYJOIN({${PF.situation}}, ',') & ',') > 0`];
    if (mode === 'list' && year === NO_YEAR) filters.push(`ARRAYJOIN({${INTAKE_FIELD}}) = ''`);
    else if (mode === 'list' && year !== 'all') {
      const [start, end] = year.split('/');
      const pattern = `(^|,)\\s*(${start}|${start.slice(-2)})\\s*[-/–]\\s*(${end}|${end.slice(-2)})\\s*(,|$)`;
      filters.push(`REGEX_MATCH(ARRAYJOIN({${INTAKE_FIELD}}, ','), '${pattern.replaceAll("\\", "\\\\")}')`);
    }
    const fields = mode === 'years' ? [PF.situation, INTAKE_FIELD] : [
      PF.situation, INTAKE_FIELD, PF.fullName, PF.email, PF.phone, PF.prospectId, LINKED_ACCOUNTS_FIELD,
      ADMISSION_REQUIREMENTS_FIELD, MOUSAD9A_FIELD, TRANSLATION_FIELD, TEST_FIELDS.type, TEST_FIELDS.done,
      DV_FIELDS.status, DEPOSIT_FIELDS.done, MEETING_FIELDS.done,
    ];
    const query = new URLSearchParams({ returnFieldsByFieldId: 'true', pageSize: '100', filterByFormula: `AND(${filters.join(',')})` });
    fields.forEach(field => query.append('fields[]', field));
    const records = [];
    let offset;
    do {
      if (offset) query.set('offset', offset);
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.prospects}?${query}`, {
        headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw authError(503, 'Impossible de charger les candidats.');
      const page = await response.json();
      records.push(...(page.records || []).filter(record => isCandidate(record.fields || {})));
      offset = page.offset;
      if (offset) await new Promise(resolve => setTimeout(resolve, 225));
    } while (offset);
    if (mode === 'years') {
      const counts = new Map();
      for (const record of records) {
        const years = schoolYears(record.fields);
        for (const value of years.length ? years : [NO_YEAR]) counts.set(value, (counts.get(value) || 0) + 1);
      }
      return res.json({
        total: records.length,
        years: [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.value.localeCompare(a.value)),
      });
    }
    const filtered = records.filter(record => matchesSchoolYear(record.fields, year));
    const accounts = new Map();
    for (const query of accountQueries(filtered)) {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.accounts}?${query}`, {
        headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw authError(503, 'Impossible de vérifier les identifiants de candidature.');
      for (const account of (await response.json()).records || []) accounts.set(account.id, account);
    }
    return res.json({
      year,
      students: filtered.map(({ id, fields }) => ({
        id, fullName: fields[PF.fullName] || fields[PF.prospectId] || 'Candidat sans nom',
        email: fields[PF.email] || '', phone: fields[PF.phone] || '', prospectId: fields[PF.prospectId] || '',
      })).sort((a, b) => a.fullName.localeCompare(b.fullName)),
      stats: preparationStats(filtered, accounts),
    });
  } catch (error) { sendAuthError(res, error); }
}
