import {
  BASE_ID,
  TABLES,
  PF,
  PAY,
  PAID_STATUS,
  DUE_STATUS,
} from './config.js';

// All requests go through the Vite dev proxy at /api/airtable, which injects the
// Authorization header server-side. Fields are requested by field ID so the
// response shape is stable regardless of field renames in Airtable.
const PROXY_BASE = '/api/airtable';

async function fetchAll(tableId, fieldIds, offset = null, acc = []) {
  const params = new URLSearchParams();
  fieldIds.forEach((f) => params.append('fields[]', f));
  params.set('pageSize', '100');
  params.set('returnFieldsByFieldId', 'true');
  if (offset) params.set('offset', offset);

  const url = `${PROXY_BASE}/${BASE_ID}/${tableId}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.error?.type || '';
    } catch {
      /* ignore */
    }
    throw new Error(
      `Airtable ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`
    );
  }

  const data = await res.json();
  const all = [...acc, ...(data.records || [])];
  return data.offset ? fetchAll(tableId, fieldIds, data.offset, all) : all;
}

function toNumber(v) {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Build a map keyed by Prospect ID text -> { eurPaid, eurDue, tndPaid, tndDue }.
// The Paiements "Prospect (link)" field returns the linked prospect's primary
// value (the Prospect ID text, e.g. "TUNRB25"), so we join on that.
function buildPaymentMap(payments) {
  return payments.reduce((acc, pay) => {
    const f = pay.fields || {};
    const ids = f[PAY.prospectLink] || [];
    const amt = toNumber(f[PAY.amount]);
    const cur = f[PAY.currency];
    const st = f[PAY.status];

    ids.forEach((id) => {
      if (!acc[id]) acc[id] = { eurPaid: 0, eurDue: 0, tndPaid: 0, tndDue: 0 };
      if (cur === 'EUR' && st === PAID_STATUS) acc[id].eurPaid += amt;
      if (cur === 'EUR' && st === DUE_STATUS) acc[id].eurDue += amt;
      if (cur === 'TND' && st === PAID_STATUS) acc[id].tndPaid += amt;
      if (cur === 'TND' && st === DUE_STATUS) acc[id].tndDue += amt;
    });
    return acc;
  }, {});
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeProspect(record, payMap) {
  const f = record.fields || {};
  const prospectId = f[PF.prospectId] || '';
  const pay = payMap[prospectId] || {
    eurPaid: 0,
    eurDue: 0,
    tndPaid: 0,
    tndDue: 0,
  };

  const approved = f[PF.approvedUniversity];
  const applicationUnis = asArray(f[PF.applicationUniversity]);
  const university =
    (approved && String(approved).trim()) ||
    applicationUnis.filter(Boolean).join(', ') ||
    '';

  return {
    id: record.id,
    fullName: f[PF.fullName] || '',
    firstName: f[PF.name] || '',
    lastName: f[PF.surname] || '',
    prospectId,
    situations: asArray(f[PF.situation]),
    nbrApplications: f[PF.nbrApplications] ?? 0,
    admissionStatus: asArray(f[PF.admissionStatus]),
    university,
    scholarshipStatus: f[PF.scholarshipStatus] || '',
    visaStatus: f[PF.visaStatus] || '',
    pay,
  };
}

// Reads the base schema so badge colors and filter choices are driven entirely
// by Airtable. Returns per-field { order: [names], colors: { name: token } }.
// Requires the PAT to have the `schema.bases:read` scope; on failure the caller
// falls back to data-derived choices with neutral colors.
async function fetchSchema() {
  const res = await fetch(`${PROXY_BASE}/meta/bases/${BASE_ID}/tables`);
  if (!res.ok) throw new Error(`Schema ${res.status}`);
  const data = await res.json();
  const table = (data.tables || []).find((t) => t.id === TABLES.prospects);
  if (!table) throw new Error('Prospects table not found in schema');

  const fieldById = (id) => (table.fields || []).find((f) => f.id === id);

  const extract = (fieldId) => {
    const field = fieldById(fieldId);
    const choices = field?.options?.choices || [];
    const order = [];
    const colors = {};
    for (const c of choices) {
      order.push(c.name);
      colors[c.name] = c.color;
    }
    return { order, colors };
  };

  return {
    situation: extract(PF.situation),
    scholarship: extract(PF.scholarshipStatus),
    visa: extract(PF.visaStatus),
    admission: extract(PF.admissionStatus),
  };
}

export async function fetchDashboardData() {
  const prospectFields = [
    PF.fullName,
    PF.name,
    PF.surname,
    PF.prospectId,
    PF.situation,
    PF.nbrApplications,
    PF.admissionStatus,
    PF.applicationUniversity,
    PF.approvedUniversity,
    PF.scholarshipStatus,
    PF.visaStatus,
  ];
  const paymentFields = [
    PAY.paymentId,
    PAY.prospectLink,
    PAY.amount,
    PAY.currency,
    PAY.status,
  ];

  const [prospectRecords, paymentRecords, schemaResult] = await Promise.all([
    fetchAll(TABLES.prospects, prospectFields),
    fetchAll(TABLES.paiements, paymentFields),
    fetchSchema().catch(() => null), // schema is best-effort
  ]);

  const payMap = buildPaymentMap(paymentRecords);
  const prospects = prospectRecords.map((r) => normalizeProspect(r, payMap));

  return { prospects, schema: schemaResult };
}
