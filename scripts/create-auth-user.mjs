import { readFileSync } from 'node:fs';
import { hashPassword, airtable, USERS_TABLE } from '../api/_lib/auth.js';

// Password is read from stdin, never a command argument or repository file.
const username = process.argv[2]?.trim().toLowerCase();
const displayName = process.argv[3] || username;
if (!/^[a-z0-9._-]{1,64}$/.test(username || '')) throw new Error('Provide a valid username.');
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
if (password.length < 12 || password.length > 256) throw new Error('Use a password of 12–256 characters.');
const params = new URLSearchParams({ filterByFormula: `{username}='${username}'`, maxRecords: '2' });
const existing = await airtable(`${USERS_TABLE}?${params}`);
if (existing.records.length) throw new Error('Username already exists; no changes made.');
const password_hash = await hashPassword(password);
const record = await airtable(USERS_TABLE, { method: 'POST', body: { fields: { username, display_name: displayName, password_hash, is_active: true } } });
const verified = await airtable(`${USERS_TABLE}/${record.id}`);
if (verified.fields.username !== username || !verified.fields.is_active || verified.fields.password_hash !== password_hash) throw new Error('Record verification failed.');
console.log(`Created and verified active user ${username} (${record.id}); password stored as scrypt hash.`);
