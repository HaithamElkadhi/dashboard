import { readFileSync } from 'node:fs';
import { AUTH_BASE, USERS_TABLE, airtable } from '../api/_lib/auth.js';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const token = process.env.AIRTABLE_AUTH_TOKEN || process.env.AIRTABLE_API_KEY;
const schemaUrl = `https://api.airtable.com/v0/meta/bases/${AUTH_BASE}/tables`;
async function schemaRequest(url, method = 'GET', body) {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`Airtable schema request failed (${response.status}).`);
  return response.json();
}
const schema = await schemaRequest(schemaUrl);
const table = schema.tables.find(table => table.id === USERS_TABLE);
const field = table.fields.find(field => field.name === 'is_admin');
if (field && field.type !== 'checkbox') throw new Error('Existing is_admin field must be a checkbox.');
if (!field) {
  await schemaRequest(`${schemaUrl}/${USERS_TABLE}/fields`, 'POST', { name: 'is_admin', type: 'checkbox', options: { icon: 'check', color: 'blueBright' } });
  console.log('Created is_admin checkbox.');
}
const params = new URLSearchParams({ filterByFormula: "{username}='jeexpert'", maxRecords: '2' });
const { records } = await airtable(`${USERS_TABLE}?${params}`);
if (records.length !== 1 || !records[0].fields.is_active) throw new Error('Expected one active jeexpert account.');
await airtable(`${USERS_TABLE}/${records[0].id}`, { method: 'PATCH', body: { fields: { is_admin: true } } });
const verified = await airtable(`${USERS_TABLE}/${records[0].id}`);
if (verified.fields.is_admin !== true) throw new Error('Admin verification failed.');
console.log('Verified: jeexpert now has admin access. Password unchanged.');
