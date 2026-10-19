import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDashboardData } from '../src/lib/airtable.js';
import { TABLES, PF, FIN } from '../src/lib/config.js';

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const zero = { eurPaid: 0, eurDue: 0, tndPaid: 0, tndDue: 0 };
const students = [
  { id: 'recSarah', fields: { [PF.fullName]: 'Sarah Layouni', [PF.prospectId]: 'SL' } },
  { id: 'recSafwen', fields: { [PF.fullName]: 'Safwen Loubiri', [PF.prospectId]: 'SL' } },
];
function fixtures(payments) {
  const requests = [];
  globalThis.fetch = async input => {
    const url = new URL(input, 'http://localhost'); requests.push(url);
    return { ok: true, json: async () => url.pathname.includes('/meta/') ? { tables: [] } : { records: url.pathname.endsWith(TABLES.prospects) ? students : payments } };
  };
  return requests;
}
test('students sharing a display code receive only their own linked payment totals', async () => {
  const payments = [300, 221, 650, 160, 350].map((amount, index) => ({ id: `recPaid${index}`, fields: { [FIN.prospects]: ['recSafwen'], [FIN.prospectId]: ['SL'], [FIN.amount]: String(amount), [FIN.currency]: 'TND', [FIN.status]: 'Payé' } }));
  payments.push({ id: 'recDue', fields: { [FIN.prospects]: ['recSafwen'], [FIN.prospectId]: ['SL'], [FIN.amount]: '500', [FIN.currency]: 'TND', [FIN.status]: 'À payer' } });
  const requests = fixtures(payments);
  const { prospects } = await fetchDashboardData();
  assert.deepEqual(prospects.find(student => student.id === 'recSarah').pay, zero);
  assert.deepEqual(prospects.find(student => student.id === 'recSafwen').pay, { ...zero, tndPaid: 1681, tndDue: 500 });
  const query = requests.find(url => url.pathname.endsWith(TABLES.paiements));
  assert.ok(query.searchParams.getAll('fields[]').includes(FIN.prospects));
});
test('a lookup code without a real linked student cannot assign money to matching initials', async () => {
  fixtures([{ id: 'recOrphan', fields: { [FIN.prospectId]: ['SL'], [FIN.amount]: '999', [FIN.currency]: 'TND', [FIN.status]: 'Payé' } }]);
  const { prospects } = await fetchDashboardData();
  for (const student of prospects) assert.deepEqual(student.pay, zero);
});
