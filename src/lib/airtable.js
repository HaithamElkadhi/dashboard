import {
  BASE_ID,
  EXPENSES_BASE_ID,
  TABLES,
  PF,
  PAY,
  PAID_STATUS,
  DUE_STATUS,
  TF,
  PICKER,
  FIN,
  ACC,
  EXP,
  BK,
} from './config.js';

// All requests go through the Vite / Vercel proxy at /api/airtable, which
// injects the Authorization header server-side. Attachment uploads use
// /api/airtable-content → content.airtable.com (required by Airtable).
const PROXY_BASE = '/api/airtable';
const CONTENT_PROXY_BASE = '/api/at-content';

async function parseError(res) {
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

async function fetchAll(tableId, fieldIds, offset = null, acc = []) {
  const params = new URLSearchParams();
  fieldIds.forEach((f) => params.append('fields[]', f));
  params.set('pageSize', '100');
  params.set('returnFieldsByFieldId', 'true');
  if (offset) params.set('offset', offset);

  const url = `${PROXY_BASE}/${BASE_ID}/${tableId}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await parseError(res);

  const data = await res.json();
  const all = [...acc, ...(data.records || [])];
  return data.offset ? fetchAll(tableId, fieldIds, data.offset, all) : all;
}

// Field-name variant (Tasks / picker tables use names from the Airtable UI).
async function fetchAllByName(tableId, fieldNames, offset = null, acc = []) {
  const params = new URLSearchParams();
  fieldNames.forEach((f) => params.append('fields[]', f));
  params.set('pageSize', '100');
  if (offset) params.set('offset', offset);

  const url = `${PROXY_BASE}/${BASE_ID}/${tableId}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await parseError(res);

  const data = await res.json();
  const all = [...acc, ...(data.records || [])];
  return data.offset
    ? fetchAllByName(tableId, fieldNames, data.offset, all)
    : all;
}

async function airtableWrite(method, path, body, { contentHost = false } = {}) {
  const base = contentHost ? CONTENT_PROXY_BASE : PROXY_BASE;
  const res = await fetch(`${base}/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await parseError(res);
  if (res.status === 204) return null;
  return res.json();
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
    visaAppointmentDate: f[PF.visaAppointmentDate] || null,
    universitalyValidation: f[PF.universitalyValidation] || '',
    scholarshipFolder: f[PF.scholarshipFolder] || '',
    scholarshipType: f[PF.scholarshipType] || '',
    scholarshipSubmissionDate: f[PF.scholarshipSubmissionDate] || null,
    scholarshipPayment: f[PF.scholarshipPayment] || '',
    scholarshipDDL: f[PF.scholarshipDDL] || null,
    regionAuthority: f[PF.regionAuthority] || '',
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
    universitaly: extract(PF.universitalyValidation),
    scholarshipType: extract(PF.scholarshipType),
    scholarshipPayment: extract(PF.scholarshipPayment),
    regionAuthority: extract(PF.regionAuthority),
  };
}

/** Fields safe to send on update — Prospect ID and the payment totals are
 * computed elsewhere (formula/lookup or joined from Paiements), so they're
 * never included here. Nbr Applications is intentionally not editable from
 * the popup — it's derived from the linked Applications, not a manual count. */
function toProspectFields(input) {
  const fields = {};
  if (input.name !== undefined) fields[PF.name] = input.name || '';
  if (input.surname !== undefined) fields[PF.surname] = input.surname || '';
  if (input.situations !== undefined) fields[PF.situation] = input.situations || [];
  if (input.admissionStatus !== undefined) {
    fields[PF.admissionStatus] = input.admissionStatus || [];
  }
  if (input.approvedUniversity !== undefined) {
    fields[PF.approvedUniversity] = input.approvedUniversity || '';
  }
  if (input.scholarshipStatus !== undefined) {
    fields[PF.scholarshipStatus] = input.scholarshipStatus || null;
  }
  if (input.visaStatus !== undefined) {
    fields[PF.visaStatus] = input.visaStatus || null;
  }
  if (input.visaAppointmentDate !== undefined) {
    fields[PF.visaAppointmentDate] = input.visaAppointmentDate || null;
  }
  if (input.universitalyValidation !== undefined) {
    fields[PF.universitalyValidation] = input.universitalyValidation || null;
  }
  if (input.scholarshipFolder !== undefined) {
    fields[PF.scholarshipFolder] = input.scholarshipFolder || '';
  }
  if (input.scholarshipType !== undefined) {
    fields[PF.scholarshipType] = input.scholarshipType || null;
  }
  if (input.scholarshipSubmissionDate !== undefined) {
    fields[PF.scholarshipSubmissionDate] = input.scholarshipSubmissionDate || null;
  }
  if (input.scholarshipPayment !== undefined) {
    fields[PF.scholarshipPayment] = input.scholarshipPayment || null;
  }
  if (input.scholarshipDDL !== undefined) {
    fields[PF.scholarshipDDL] = input.scholarshipDDL || null;
  }
  if (input.regionAuthority !== undefined) {
    fields[PF.regionAuthority] = input.regionAuthority || null;
  }
  return fields;
}

// Same returnFieldsByFieldId + typecast requirement as the other write
// endpoints (see updatePaiement) — select fields are written by field ID.
export async function updateProspect(recordId, input) {
  const data = await airtableWrite(
    'PATCH',
    `${BASE_ID}/${TABLES.prospects}/${recordId}`,
    {
      fields: toProspectFields(input),
      returnFieldsByFieldId: true,
      typecast: true,
    }
  );
  const f = data.fields || {};
  return {
    fullName: f[PF.fullName] || '',
    firstName: f[PF.name] || '',
    lastName: f[PF.surname] || '',
    situations: asArray(f[PF.situation]),
    admissionStatus: asArray(f[PF.admissionStatus]),
    approvedUniversity: f[PF.approvedUniversity] || '',
    scholarshipStatus: f[PF.scholarshipStatus] || '',
    visaStatus: f[PF.visaStatus] || '',
    visaAppointmentDate: f[PF.visaAppointmentDate] || null,
    universitalyValidation: f[PF.universitalyValidation] || '',
    scholarshipFolder: f[PF.scholarshipFolder] || '',
    scholarshipType: f[PF.scholarshipType] || '',
    scholarshipSubmissionDate: f[PF.scholarshipSubmissionDate] || null,
    scholarshipPayment: f[PF.scholarshipPayment] || '',
    scholarshipDDL: f[PF.scholarshipDDL] || null,
    regionAuthority: f[PF.regionAuthority] || '',
  };
}

export async function deleteProspect(recordId) {
  await airtableWrite('DELETE', `${BASE_ID}/${TABLES.prospects}/${recordId}`);
  return recordId;
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
    PF.visaAppointmentDate,
    PF.universitalyValidation,
    PF.scholarshipFolder,
    PF.scholarshipType,
    PF.scholarshipSubmissionDate,
    PF.scholarshipPayment,
    PF.scholarshipDDL,
    PF.regionAuthority,
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

// ─── Tasks ───────────────────────────────────────────────────────────────────

const TASK_FIELDS = [
  TF.status,
  TF.priority,
  TF.type,
  TF.assignedTo,
  TF.ddl,
  TF.prospectName,
  TF.description,
  TF.notes,
  TF.ticketId,
];

function normalizeTask(record) {
  const f = record.fields || {};
  const description = f[TF.description] || '';
  return {
    id: record.id,
    // App "name"/title = Airtable Description (Name field removed)
    name: description,
    status: f[TF.status] || 'Todo',
    priority: f[TF.priority] || '',
    type: f[TF.type] || '',
    assignedTo: f[TF.assignedTo] || '',
    ddl: f[TF.ddl] || '',
    prospectName: f[TF.prospectName] || '',
    description,
    notes: f[TF.notes] || '',
    ticketId: f[TF.ticketId] || '',
  };
}

/** Fields safe to send on create/update — never include Ticket ID. */
function toAirtableFields(input) {
  const fields = {};
  if (input.status != null) fields[TF.status] = input.status;
  if (input.priority != null) fields[TF.priority] = input.priority;
  if (input.type != null) fields[TF.type] = input.type;
  if (input.assignedTo != null) fields[TF.assignedTo] = input.assignedTo;
  if (input.ddl !== undefined) {
    fields[TF.ddl] = input.ddl || null;
  }
  if (input.prospectName !== undefined) {
    fields[TF.prospectName] = input.prospectName || '';
  }
  // Title from the form (`name`) is stored in Description
  if (input.name != null || input.description !== undefined) {
    fields[TF.description] =
      (input.name != null ? input.name : input.description) || '';
  }
  if (input.notes !== undefined) {
    fields[TF.notes] = input.notes || '';
  }
  return fields;
}

export async function fetchTasks() {
  const records = await fetchAllByName(TABLES.tasks, TASK_FIELDS);
  return records.map(normalizeTask);
}

export async function createTask(input) {
  const data = await airtableWrite('POST', `${BASE_ID}/${TABLES.tasks}`, {
    fields: toAirtableFields(input),
  });
  return normalizeTask(data);
}

export async function updateTask(recordId, input) {
  const data = await airtableWrite(
    'PATCH',
    `${BASE_ID}/${TABLES.tasks}/${recordId}`,
    { fields: toAirtableFields(input) }
  );
  return normalizeTask(data);
}

export async function deleteTask(recordId) {
  await airtableWrite('DELETE', `${BASE_ID}/${TABLES.tasks}/${recordId}`);
  return recordId;
}

export async function fetchPeopleForPicker() {
  const [prospectRecords, leadRecords] = await Promise.all([
    fetchAllByName(TABLES.prospects, [
      PICKER.prospectFullName,
      PICKER.prospectId,
    ]),
    fetchAllByName(TABLES.leads, [PICKER.leadFullName]),
  ]);

  const prospects = prospectRecords.map((r) => {
    const f = r.fields || {};
    return {
      key: `prospect:${r.id}`,
      recordId: r.id,
      fullName: f[PICKER.prospectFullName] || '',
      badgeId: f[PICKER.prospectId] || '',
      source: 'Prospect',
    };
  });

  const leads = leadRecords.map((r) => {
    const f = r.fields || {};
    return {
      key: `lead:${r.id}`,
      recordId: r.id,
      fullName: f[PICKER.leadFullName] || '',
      badgeId: r.id.slice(0, 8),
      source: 'Lead',
    };
  });

  return [...prospects, ...leads].filter((p) => p.fullName);
}

// Prospects only (with contact fields) — used by the Operations tools'
// "Search Airtable" pickers to auto-fill a student's name/email/phone.
export async function fetchProspectsForSearch() {
  const records = await fetchAll(TABLES.prospects, [PF.fullName, PF.email, PF.phone]);
  return records
    .map((r) => {
      const f = r.fields || {};
      return {
        id: r.id,
        fullName: f[PF.fullName] || '',
        email: f[PF.email] || '',
        phone: f[PF.phone] || '',
      };
    })
    .filter((p) => p.fullName);
}

// ─── Finance (Paiements) ───────────────────────────────────────────────────

const FIN_FIELDS = Object.values(FIN);

function normalizePaiement(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    reference: f[FIN.reference] || '',
    prospectRecordIds: asArray(f[FIN.prospects]),
    fullName: (asArray(f[FIN.fullName])[0] || '').toString(),
    email: (asArray(f[FIN.email])[0] || '').toString(),
    prospectId: (asArray(f[FIN.prospectId])[0] || '').toString(),
    amount: toNumber(f[FIN.amount]),
    currency: f[FIN.currency] || 'EUR',
    status: f[FIN.status] || '',
    purpose: asArray(f[FIN.purpose]),
    dueDate: f[FIN.dueDate] || null,
    paymentDate: f[FIN.paymentDate] || null,
    paymentMethod: f[FIN.paymentMethod] || '',
    comment: f[FIN.comment] || '',
    exemptionReason: f[FIN.exemptionReason] || '',
    billingAddress: f[FIN.billingAddress] || '',
    taxe: f[FIN.taxe] ?? 0,
    commCommercial: f[FIN.commCommercial] ?? 0,
    soldeConfirme: !!f[FIN.soldeConfirme],
    netARecevoir: toNumber(f[FIN.netARecevoir]),
    moezType: f[FIN.moezType] || null,
    moezValeur: f[FIN.moezValeur] ?? 0,
    commissionMoez: toNumber(f[FIN.commissionMoez]),
    invoice: f[FIN.invoice] || [],
    proofOfPayment: f[FIN.proofOfPayment] || [],
  };
}

// The Airtable `commissionMoez` formula is 0 while soldeConfirme is false (the
// commission isn't payable yet), so the field can't show what it *would* be.
// This mirrors that same formula without the soldeConfirme gate, so the UI
// can display the pending amount next to a "Suspendue" label.
export function computeMoezAmount(p) {
  if (!p.moezType || p.moezType === 'Aucune') return 0;
  if (p.moezType === '%') return (p.netARecevoir * (p.moezValeur || 0)) / 100;
  if (p.moezType === 'Fixe') return p.moezValeur || 0;
  return 0;
}

/** Fields safe to send on create/update — formula/lookup fields are never included. */
function toPaiementFields(input) {
  const fields = {};
  if (input.prospectRecordIds !== undefined) {
    fields[FIN.prospects] = input.prospectRecordIds || [];
  }
  if (input.amount !== undefined) fields[FIN.amount] = String(input.amount);
  if (input.currency !== undefined) fields[FIN.currency] = input.currency;
  if (input.status !== undefined) fields[FIN.status] = input.status;
  if (input.purpose !== undefined) fields[FIN.purpose] = input.purpose || [];
  if (input.dueDate !== undefined) fields[FIN.dueDate] = input.dueDate || null;
  if (input.paymentDate !== undefined) {
    fields[FIN.paymentDate] = input.paymentDate || null;
  }
  if (input.paymentMethod !== undefined) {
    fields[FIN.paymentMethod] = input.paymentMethod || '';
  }
  if (input.comment !== undefined) fields[FIN.comment] = input.comment || '';
  if (input.exemptionReason !== undefined) {
    fields[FIN.exemptionReason] = input.exemptionReason || '';
  }
  if (input.billingAddress !== undefined) {
    fields[FIN.billingAddress] = input.billingAddress || '';
  }
  if (input.taxe !== undefined) fields[FIN.taxe] = Number(input.taxe) || 0;
  if (input.commCommercial !== undefined) {
    fields[FIN.commCommercial] = Number(input.commCommercial) || 0;
  }
  if (input.soldeConfirme !== undefined) {
    fields[FIN.soldeConfirme] = !!input.soldeConfirme;
  }
  if (input.moezType !== undefined) fields[FIN.moezType] = input.moezType || null;
  if (input.moezValeur !== undefined) {
    fields[FIN.moezValeur] = Number(input.moezValeur) || 0;
  }
  return fields;
}

export async function fetchPaiements() {
  const records = await fetchAll(TABLES.paiements, FIN_FIELDS);
  return records.map(normalizePaiement);
}

// Live choices for the Purpose field, read from the Airtable schema so the
// list in the app always matches what's configured in Airtable (renaming or
// adding a Purpose option there needs no code change). Best-effort — the
// caller falls back to PURPOSE_CHOICES (config.js) if this fails, e.g.
// missing `schema.bases:read` PAT scope.
export async function fetchPurposeChoices() {
  const res = await fetch(`${PROXY_BASE}/meta/bases/${BASE_ID}/tables`);
  if (!res.ok) throw new Error(`Schema ${res.status}`);
  const data = await res.json();
  const table = (data.tables || []).find((t) => t.id === TABLES.paiements);
  if (!table) throw new Error('Paiements table not found in schema');
  const field = (table.fields || []).find((f) => f.id === FIN.purpose);
  const choices = field?.options?.choices || [];
  return choices.map((c) => c.name);
}

// PATCH/POST responses are keyed by field NAME by default — FIN.* are field
// IDs (to match fetchPaiements' returnFieldsByFieldId GETs), so writes must
// request the same keying or normalizePaiement silently reads undefined for
// every field (e.g. a checkbox flip would always normalize back to false).
// Unlike GET, Airtable only honors this as a body param on write endpoints —
// a `?returnFieldsByFieldId=true` query string is silently ignored there.
// `typecast: true` is also required: without it, writing a select field by
// field ID with a plain option-name string (e.g. Purpose) makes Airtable try
// to CREATE a new option with that name instead of matching the existing one
// — and fails with "Insufficient permissions to create new select option".
export async function createPaiement(input) {
  const data = await airtableWrite('POST', `${BASE_ID}/${TABLES.paiements}`, {
    fields: toPaiementFields(input),
    returnFieldsByFieldId: true,
    typecast: true,
  });
  return normalizePaiement(data);
}

export async function updatePaiement(recordId, input) {
  const data = await airtableWrite(
    'PATCH',
    `${BASE_ID}/${TABLES.paiements}/${recordId}`,
    {
      fields: toPaiementFields(input),
      returnFieldsByFieldId: true,
      typecast: true,
    }
  );
  return normalizePaiement(data);
}

// ─── Client Account Management (CAM) ───────────────────────────────────────

// Live choices for Accounts.label (type de compte) and Accounts.delegation,
// read from the Airtable schema so renaming/adding options in Airtable needs
// no code change. Best-effort — the caller falls back to ACCOUNT_LABELS /
// DELEGATION_CHOICES if this fails (e.g. missing `schema.bases:read` scope).
export async function fetchAccountSelectChoices() {
  const res = await fetch(`${PROXY_BASE}/meta/bases/${BASE_ID}/tables`);
  if (!res.ok) throw new Error(`Schema ${res.status}`);
  const data = await res.json();
  const table = (data.tables || []).find((t) => t.id === TABLES.accounts);
  if (!table) throw new Error('Accounts table not found in schema');
  const fields = table.fields || [];
  const labelField = fields.find((f) => f.id === ACC.label);
  const delegationField = fields.find((f) => f.id === ACC.delegation);
  return {
    labels: (labelField?.options?.choices || []).map((c) => c.name),
    delegations: (delegationField?.options?.choices || []).map((c) => c.name),
  };
}

function normalizeProspectForAccounts(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    fullName: f[PF.fullName] || '',
    prospectId: f[PF.prospectId] || '',
    situations: asArray(f[PF.situation]),
    email: f[PF.email] || '',
    phone: f[PF.phone] || '',
    accountRecordIds: asArray(f[PF.accountsLink]),
  };
}

// Lighter than fetchDashboardData — only the fields CAM needs, so this page
// doesn't pull in admission/university/scholarship/payment fields it never
// uses.
export async function fetchProspectsForAccounts() {
  const fields = [
    PF.fullName,
    PF.prospectId,
    PF.situation,
    PF.email,
    PF.phone,
    PF.accountsLink,
  ];
  const records = await fetchAll(TABLES.prospects, fields);
  return records.map(normalizeProspectForAccounts);
}

function normalizeAccount(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    mailUser: f[ACC.mailUser] || '',
    labels: asArray(f[ACC.label]),
    prospectRecordIds: asArray(f[ACC.prospectLink]),
    prospectId: (asArray(f[ACC.prospectId])[0] || '').toString(),
    link: f[ACC.link] || '',
    password: f[ACC.password] || '',
    delegation: f[ACC.delegation] || '',
  };
}

// The whole Accounts table in one fetch (it's small) — the caller joins to
// prospects client-side via prospectRecordIds, avoiding one request per
// prospect.
export async function fetchAccounts() {
  const fields = Object.values(ACC);
  const records = await fetchAll(TABLES.accounts, fields);
  return records.map(normalizeAccount);
}

function toAccountFields(input) {
  const fields = {};
  if (input.mailUser !== undefined) fields[ACC.mailUser] = input.mailUser || '';
  if (input.label !== undefined) {
    fields[ACC.label] = input.label ? [input.label] : [];
  }
  if (input.prospectRecordId !== undefined) {
    fields[ACC.prospectLink] = input.prospectRecordId ? [input.prospectRecordId] : [];
  }
  if (input.link !== undefined) fields[ACC.link] = input.link || '';
  if (input.password !== undefined) fields[ACC.password] = input.password || '';
  if (input.delegation !== undefined) fields[ACC.delegation] = input.delegation || null;
  return fields;
}

// Same returnFieldsByFieldId + typecast requirement as Paiements above:
// `label`/`delegation` are select fields written by field ID, so without
// typecast Airtable tries to create new options instead of matching existing
// ones and fails with a permissions error.
export async function createAccount(input) {
  const data = await airtableWrite('POST', `${BASE_ID}/${TABLES.accounts}`, {
    fields: toAccountFields(input),
    returnFieldsByFieldId: true,
    typecast: true,
  });
  return normalizeAccount(data);
}

export async function updateAccount(recordId, input) {
  const data = await airtableWrite(
    'PATCH',
    `${BASE_ID}/${TABLES.accounts}/${recordId}`,
    {
      fields: toAccountFields(input),
      returnFieldsByFieldId: true,
      typecast: true,
    }
  );
  return normalizeAccount(data);
}

export async function deleteAccount(recordId) {
  await airtableWrite('DELETE', `${BASE_ID}/${TABLES.accounts}/${recordId}`);
  return recordId;
}

// ─── Expenses (separate Airtable base) ─────────────────────────────────────

const EXP_FIELDS = [
  EXP.description,
  EXP.amount,
  EXP.currency,
  EXP.date,
  EXP.category,
  EXP.paymentMethod,
  EXP.status,
  EXP.paidBy,
  EXP.notes,
  EXP.invoice,
];

async function fetchAllInBase(baseId, tableId, fieldIds, offset = null, acc = []) {
  const params = new URLSearchParams();
  fieldIds.forEach((f) => params.append('fields[]', f));
  params.set('pageSize', '100');
  params.set('returnFieldsByFieldId', 'true');
  if (offset) params.set('offset', offset);

  const url = `${PROXY_BASE}/${baseId}/${tableId}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await parseError(res);

  const data = await res.json();
  const all = [...acc, ...(data.records || [])];
  return data.offset
    ? fetchAllInBase(baseId, tableId, fieldIds, data.offset, all)
    : all;
}

function normalizeExpense(record) {
  const f = record.fields || {};
  const invoices = asArray(f[EXP.invoice]).map((att) => ({
    id: att.id || '',
    url: att.url || '',
    filename: att.filename || 'Invoice',
    type: att.type || '',
    size: att.size || 0,
  }));
  return {
    id: record.id,
    description: f[EXP.description] || '',
    amount: toNumber(f[EXP.amount]),
    currency: f[EXP.currency] || 'EUR',
    date: f[EXP.date] || null,
    categories: asArray(f[EXP.category]),
    paymentMethod: f[EXP.paymentMethod] || '',
    status: f[EXP.status] || 'Paid',
    paidBy: f[EXP.paidBy] || '',
    notes: f[EXP.notes] || '',
    invoices,
  };
}

function toExpenseFields(input) {
  const fields = {};
  if (input.description !== undefined) {
    fields[EXP.description] = (input.description || '').trim();
  }
  if (input.amount !== undefined) fields[EXP.amount] = Number(input.amount);
  if (input.currency !== undefined) fields[EXP.currency] = input.currency || 'EUR';
  if (input.date !== undefined) fields[EXP.date] = input.date || null;
  if (input.category !== undefined) {
    // Form uses a single choice; Airtable field is multipleSelects.
    const cats = Array.isArray(input.category)
      ? input.category
      : input.category
        ? [input.category]
        : [];
    fields[EXP.category] = cats;
  }
  if (input.paymentMethod !== undefined) {
    fields[EXP.paymentMethod] = input.paymentMethod || null;
  }
  if (input.status !== undefined) fields[EXP.status] = input.status || 'Paid';
  if (input.paidBy !== undefined) fields[EXP.paidBy] = (input.paidBy || '').trim();
  if (input.notes !== undefined) fields[EXP.notes] = input.notes || '';
  return fields;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

const MAX_INVOICE_BYTES = 5 * 1024 * 1024;

/** Append a file to the Invoice / Bill attachment field (max 5 MB). */
export async function uploadExpenseInvoice(recordId, file) {
  if (!file) throw new Error('No file selected');
  if (file.size > MAX_INVOICE_BYTES) {
    throw new Error(`“${file.name}” is over 5 MB. Compress it or upload a smaller file.`);
  }
  const base64 = await fileToBase64(file);
  // Airtable's uploadAttachment lives on content.airtable.com (not api.airtable.com).
  const data = await airtableWrite(
    'POST',
    `${EXPENSES_BASE_ID}/${recordId}/${EXP.invoice}/uploadAttachment`,
    {
      contentType: file.type || 'application/octet-stream',
      file: base64,
      filename: file.name || 'invoice',
    },
    { contentHost: true }
  );
  return normalizeExpense(data);
}

export async function fetchExpenses() {
  const records = await fetchAllInBase(
    EXPENSES_BASE_ID,
    TABLES.expenses,
    EXP_FIELDS
  );
  return records.map(normalizeExpense);
}

export async function createExpense(input) {
  const data = await airtableWrite(
    'POST',
    `${EXPENSES_BASE_ID}/${TABLES.expenses}`,
    {
      fields: toExpenseFields(input),
      returnFieldsByFieldId: true,
      typecast: true,
    }
  );
  return normalizeExpense(data);
}

export async function updateExpense(recordId, input) {
  const data = await airtableWrite(
    'PATCH',
    `${EXPENSES_BASE_ID}/${TABLES.expenses}/${recordId}`,
    {
      fields: toExpenseFields(input),
      returnFieldsByFieldId: true,
      typecast: true,
    }
  );
  return normalizeExpense(data);
}

export async function deleteExpense(recordId) {
  await airtableWrite(
    'DELETE',
    `${EXPENSES_BASE_ID}/${TABLES.expenses}/${recordId}`
  );
  return recordId;
}

// ─── Bookings ──────────────────────────────────────────────────────────────

const BK_FIELDS = Object.values(BK);

function normalizeBooking(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    name: f[BK.name] || '',
    studentName: f[BK.studentName] || '',
    email: f[BK.email] || '',
    phone: f[BK.phone] || '',
    dateTime: f[BK.dateTime] || null,
    duration: f[BK.duration] ?? null,
    meetingType: f[BK.meetingType] || '',
    bookingStatus: f[BK.bookingStatus] || '',
    prospectRecordIds: asArray(f[BK.linkedProspect]),
    meetingLink: f[BK.meetingLink] || '',
    notes: f[BK.notes] || '',
  };
}

/** Fields safe to send on create/update. */
function toBookingFields(input) {
  const fields = {};
  if (input.name !== undefined) fields[BK.name] = input.name || '';
  if (input.studentName !== undefined) fields[BK.studentName] = input.studentName || '';
  if (input.email !== undefined) fields[BK.email] = input.email || '';
  if (input.phone !== undefined) fields[BK.phone] = input.phone || '';
  if (input.dateTime !== undefined) fields[BK.dateTime] = input.dateTime || null;
  if (input.duration !== undefined) {
    fields[BK.duration] =
      input.duration === '' || input.duration === null
        ? null
        : Number(input.duration);
  }
  if (input.meetingType !== undefined) fields[BK.meetingType] = input.meetingType || null;
  if (input.bookingStatus !== undefined) {
    fields[BK.bookingStatus] = input.bookingStatus || null;
  }
  if (input.prospectRecordIds !== undefined) {
    fields[BK.linkedProspect] = input.prospectRecordIds || [];
  }
  if (input.meetingLink !== undefined) fields[BK.meetingLink] = input.meetingLink || '';
  if (input.notes !== undefined) fields[BK.notes] = input.notes || '';
  return fields;
}

export async function fetchBookings() {
  const records = await fetchAll(TABLES.bookings, BK_FIELDS);
  return records.map(normalizeBooking);
}

// Live Meeting Type / Booking Status choices from the Airtable schema.
export async function fetchBookingSelectChoices() {
  const res = await fetch(`${PROXY_BASE}/meta/bases/${BASE_ID}/tables`);
  if (!res.ok) throw new Error(`Schema ${res.status}`);
  const data = await res.json();
  const table = (data.tables || []).find((t) => t.id === TABLES.bookings);
  if (!table) throw new Error('Bookings table not found in schema');
  const fields = table.fields || [];
  const statusField = fields.find((f) => f.id === BK.bookingStatus);
  const typeField = fields.find((f) => f.id === BK.meetingType);
  return {
    statuses: (statusField?.options?.choices || []).map((c) => c.name),
    meetingTypes: (typeField?.options?.choices || []).map((c) => c.name),
  };
}

export async function createBooking(input) {
  const data = await airtableWrite('POST', `${BASE_ID}/${TABLES.bookings}`, {
    fields: toBookingFields(input),
    returnFieldsByFieldId: true,
    typecast: true,
  });
  return normalizeBooking(data);
}

export async function updateBooking(recordId, input) {
  const data = await airtableWrite(
    'PATCH',
    `${BASE_ID}/${TABLES.bookings}/${recordId}`,
    {
      fields: toBookingFields(input),
      returnFieldsByFieldId: true,
      typecast: true,
    }
  );
  return normalizeBooking(data);
}

export async function deleteBooking(recordId) {
  await airtableWrite('DELETE', `${BASE_ID}/${TABLES.bookings}/${recordId}`);
  return recordId;
}
