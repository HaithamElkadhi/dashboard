import { readFileSync } from 'node:fs';
import { airtable, SESSIONS_TABLE } from '../api/_lib/auth.js';
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
let count = 0;
const cutoff = new Date().toISOString();
while (true) {
  const params = new URLSearchParams({ filterByFormula: `IS_BEFORE({expires_at},'${cutoff}')`, maxRecords: '10' });
  const { records } = await airtable(`${SESSIONS_TABLE}?${params}`);
  if (!records.length) break;
  const deletes = new URLSearchParams();
  for (const record of records) deletes.append('records[]', record.id);
  await airtable(`${SESSIONS_TABLE}?${deletes}`, { method: 'DELETE' });
  count += records.length;
}
console.log(`Removed ${count} expired session/attempt records.`);
