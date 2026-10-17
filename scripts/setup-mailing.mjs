import { readFileSync, existsSync } from 'node:fs';
import { BASE_ID } from '../src/lib/config.js';
if (existsSync('.env')) for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const token = process.env.AIRTABLE_API_KEY;
if (!token) throw new Error('AIRTABLE_API_KEY required with schema.bases:read and schema.bases:write scopes.');
const root = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
async function request(url, method='GET', body) {
  const response = await fetch(url, { method, headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, ...(body ? { body:JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Mailing schema setup failed (${response.status}). Use manual setup documented in docs/mailing-setup.md.`);
  return response.json();
}
const definitions = [{ name:'Name',type:'singleLineText' },{ name:'Subject',type:'singleLineText' },{ name:'Body',type:'multilineText' },{ name:'CC',type:'multilineText' },{ name:'From Key',type:'singleLineText' },{ name:'Attachments',type:'multipleAttachments' }];
const configured = process.env.MAILING_TEMPLATES_TABLE || 'Mailing Templates';
const schema = await request(root);
let table = schema.tables.find(item => item.id === configured || item.name === configured);
if (!process.argv.includes('--apply')) {
  console.log(table ? `Inspecting ${table.name} (${table.id}).` : `Would create ${configured}.`);
  for (const definition of definitions) {
    const existing = table?.fields.find(field=>field.name===definition.name);
    console.log(`${definition.name}: ${existing ? existing.type === definition.type ? 'ready' : 'incompatible type' : 'would create'}`);
  }
  console.log('Run with --apply to provision missing schema.');
  process.exit(0);
}
if (!table) {
  if (configured.startsWith('tbl')) throw new Error('Configured table ID does not exist.');
  table = await request(root,'POST',{ name:configured,fields:definitions });
} else for (const definition of definitions) {
  const existing = table.fields.find(field => field.name === definition.name);
  if (existing && existing.type !== definition.type) throw new Error(`Field ${definition.name} must have type ${definition.type}; no destructive migration performed.`);
  if (!existing) table.fields.push(await request(`${root}/${table.id}/fields`,'POST',definition));
}
console.log(`MAILING_TEMPLATES_TABLE=${table.id}`);
console.log(`MAILING_ATTACHMENTS_FIELD=${table.fields.find(field=>field.name==='Attachments').id}`);
