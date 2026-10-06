export const APPLICATION_TABLE = 'tblGP4mMaQs1XeVME';
export const APPLICATION_LINK = 'fldNNUfBOKjPpP18l';
export const APPLICATION_FIELDS = {
  university: 'fldQxBB0hjUhnRZyJ', student: 'fldjZwpov9XRo3fRX',
  course: 'fldSQQ2PO9CInBxFG', language: 'fldSZUUcWnWspMgz0',
  degree: 'fldsK9b7mzUUCqFwX', city: 'fldQyeEk9hMymvJoo',
  portalUrl: 'fldRKSZdBmJalH3SE', passwordHint: 'fldE3veJSfBFSlUXu',
  status: 'fldIVAzFqAqdtrTmN', candidacyDate: 'fldFDzhe6oIWNsMAR',
  answerDate: 'fld7l1TnimwCwH47T', comment: 'fldYSRpaYJdx1Ikuc',
  submittedBy: 'fldkwYmUtIwKezkty', modifiedAt: 'fldZpCB5yeKbPrBs6',
};
export const APPLICATION_STATUSES = ['Proposal', 'Submitted', 'Admitted', 'Rejected'];
export const APPLICATION_LANGUAGES = ['IT', 'EN'];
export const DEGREE_LABELS = { 'Laurea Triennale': 'Bachelor — Laurea Triennale', 'Laurea Magistrale': 'Master — Laurea Magistrale' };
export const newApplication = () => ({ university: '', course: '', language: '', degree: '', city: '', portalUrl: '', passwordHint: '', status: 'Submitted', candidacyDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), answerDate: '', comment: '' });
export function normalizeApplication(record) {
  const f = record.fields || {};
  return { id: record.id, ...Object.fromEntries(Object.entries(APPLICATION_FIELDS).filter(([key]) => key !== 'student').map(([key, field]) => [key, f[field] || ''])) };
}
const fold = value => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function sameApplication(a, b) {
  return ['university', 'course', 'degree', 'language'].every(key => fold(a[key]) === fold(b[key]));
}
export async function applicationsApi(studentId, input, confirmDuplicate = false, application = null) {
  const response = await fetch('/api/applications' + (studentId ? '?studentId=' + encodeURIComponent(studentId) : ''), input ? {
    method: application ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, input, confirmDuplicate, ...(application ? { applicationId: application.id, expected: application } : {}) }),
  } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Unable to load applications.'), { status: response.status });
  return data;
}
