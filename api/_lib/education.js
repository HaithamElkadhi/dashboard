import { requireAdmin, checkOrigin, authError, sendAuthError } from './auth.js';
import { EDUCATION_BASE, EDUCATION_ENTITIES, EDUCATION_OPTIONS, normalizeEducationRecord } from '../../src/lib/education.js';
const recordId = value => typeof value === 'string' && /^rec[A-Za-z0-9]+$/.test(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const invalid = message => { throw authError(400, message); };
// Airtable limits each base to five requests per second, including paginated reads.
let educationQueue = Promise.resolve();
let nextEducationRequestAt = 0;
function queueEducationRequest(run) {
  const operation = educationQueue.then(async () => {
    const wait = nextEducationRequestAt - Date.now();
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    nextEducationRequestAt = Date.now() + 225;
    return run();
  });
  educationQueue = operation.catch(() => {});
  return operation;
}
export function safeAttachmentUrl(value) {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && host.includes('.') && !host.endsWith('.local') && !host.endsWith('.localhost') && !host.endsWith('.internal') && !host.includes(':') && !/^\d+\.\d+\.\d+\.\d+$/.test(host);
  } catch { return false; }
}
export function validateEducationFields(entity, input, original = {}, options = EDUCATION_OPTIONS[entity] || {}) {
  const definition = EDUCATION_ENTITIES[entity];
  if (!Object.hasOwn(EDUCATION_ENTITIES, entity) || !definition || !input || Array.isArray(input) || typeof input !== 'object' || !Object.keys(input).length) invalid('Champs Education invalides.');
  const fields = {};
  for (const [name, value] of Object.entries(input)) {
    const field = definition.fields.find(item => item.name === name);
    if (!field) invalid(`Champ non autorisé : ${name}.`);
    if (field.type === 'multipleRecordLinks') {
      if (!Array.isArray(value) || value.length > (name === 'Parents' ? 10 : 1) || value.some(id => !recordId(id)) || new Set(value).size !== value.length) invalid(`Lien invalide : ${name}.`);
      fields[name] = value;
    } else if (field.type === 'multipleAttachments') {
      if (!Array.isArray(value) || value.length > (name === 'Photo' ? 1 : 10)) invalid(name === 'Photo' ? 'Une seule photo par élève.' : 'Maximum 10 pièces jointes.');
      fields[name] = value.map(item => {
        if (!item || typeof item !== 'object' || Object.keys(item).some(key => !['id', 'url', 'filename', 'size', 'type', 'thumbnails', 'width', 'height'].includes(key))) invalid('Pièce jointe invalide.');
        if (item.id) {
          if (!(original[name] || []).some(old => old.id === item.id)) invalid('Pièce jointe inconnue.');
          return { id: item.id };
        }
        if (!safeAttachmentUrl(item.url) || item.url.length > 4000 || item.filename !== undefined && (typeof item.filename !== 'string' || item.filename.length > 200)) invalid('Utilisez une URL HTTPS publique pour la pièce jointe.');
        return { url: item.url, ...(item.filename ? { filename: item.filename } : {}) };
      });
    } else if (field.type === 'number') {
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000)) invalid(`Nombre invalide : ${name}.`);
      if (name === 'Durée en minutes' && value !== null && !Number.isInteger(value)) invalid('La durée doit être un nombre entier de minutes.');
      fields[name] = value;
    } else if (field.type === 'date') {
      if (value !== null && value !== '' && !validDate(value)) invalid(`Date invalide : ${name}.`);
      fields[name] = value || null;
    } else {
      if (value !== null && (typeof value !== 'string' || value.length > (field.type === 'multilineText' ? 20000 : 500))) invalid(`Texte invalide : ${name}.`);
      if (field.type === 'singleSelect' && value && !options[name]?.includes(value)) invalid(`Choix invalide : ${name}.`);
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) invalid(`Email invalide : ${name}.`);
      fields[name] = typeof value === 'string' ? value.trim() : value;
    }
  }
  const merged = { ...original, ...fields };
  for (const name of definition.required) if (merged[name] === undefined || merged[name] === null || merged[name] === '' || Array.isArray(merged[name]) && !merged[name].length) invalid(`Champ requis : ${name}.`);
  if (entity === 'results' && merged.Note > 20) invalid('La note doit être comprise entre 0 et 20.');
  return fields;
}
const canonical = value => JSON.stringify(value, function (key, item) { return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item; });
// Airtable changes inverse links and signed attachment URLs independently of the
// fields in this editor. Only compare editable values to avoid false conflicts.
const editableSnapshot = (definition, fields) => Object.fromEntries(definition.fields.map(field => [field.name, field.type === 'multipleAttachments' ? (fields[field.name] || []).map(file => file.id ? { id: file.id } : { url: file.url }) : fields[field.name] ?? null]));
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    await requireAdmin(req, env);
    if (req.method !== 'GET') checkOrigin(req, env);
    if (!env.AIRTABLE_API_KEY) throw authError(503, 'Education Airtable non configuré.');
    const request = async (path, method = 'GET', fields) => {
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await queueEducationRequest(() => fetch(`https://api.airtable.com/v0/${path}`, { method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, ...(fields ? { body: JSON.stringify({ fields }) } : {}), signal: AbortSignal.timeout(20000) }));
        if (response.status !== 429 || attempt === 2) break;
        await new Promise(resolve => setTimeout(resolve, Math.min(5000, Math.max(1000 * 2 ** attempt, Number(response.headers?.get('retry-after') || 0) * 1000))));
      }
      if (!response.ok) throw authError(response.status === 404 ? 404 : 503, method === 'GET' ? 'Impossible de charger Education.' : 'Enregistrement non confirmé. Actualisez avant de réessayer.');
      return response.json();
    };
    const options = EDUCATION_OPTIONS;
    if (req.method === 'GET') {
      const tables = {};
      for (const [entity, definition] of Object.entries(EDUCATION_ENTITIES)) {
        const records = []; let offset;
        do {
          const params = new URLSearchParams({ pageSize: '100' }); if (offset) params.set('offset', offset);
          const page = await request(`${EDUCATION_BASE}/${definition.tableId}?${params}`);
          records.push(...page.records); offset = page.offset;
        } while (offset);
        tables[entity] = records.map(normalizeEducationRecord);
      }
      return res.json({ tables, options });
    }
    const body = req.body;
    if (req.method === 'POST' && body?.action === 'attendance') {
      if (!validDate(body.date) || !recordId(body.classId) || !Array.isArray(body.marks) || !body.marks.length || body.marks.length > 100 || new Set(body.marks.map(mark => mark?.studentId)).size !== body.marks.length) invalid('Appel invalide.');
      await request(`${EDUCATION_BASE}/${EDUCATION_ENTITIES.classes.tableId}/${body.classId}`);
      const readFiltered = async (entity, formula) => {
        const records = []; let offset;
        do {
          const params = new URLSearchParams({ pageSize: '100', filterByFormula: formula });
          if (offset) params.set('offset', offset);
          const page = await request(`${EDUCATION_BASE}/${EDUCATION_ENTITIES[entity].tableId}?${params}`);
          records.push(...page.records); offset = page.offset;
        } while (offset);
        return records;
      };
      // Link fields stringify their display values, so validate class membership on
      // the returned linked IDs instead of relying on Airtable formula coercion.
      if (body.marks.some(mark => !recordId(mark?.studentId) || !EDUCATION_OPTIONS.attendance['Présence'].includes(mark.status))) invalid('Présence invalide.');
      const students = await readFiltered('students', `OR(${body.marks.map(mark => `RECORD_ID()='${mark.studentId}'`).join(',')})`);
      const members = new Set(students.filter(student => student.fields.Classe?.includes(body.classId)).map(student => student.id));
      if (body.expected !== undefined) {
        if (!Array.isArray(body.expected) || body.expected.some(record => !recordId(record?.id) || !record.fields || typeof record.fields !== 'object')) invalid('Instantané appel invalide.');
        const current = (await readFiltered('attendance', `IS_SAME({Date}, '${body.date}', 'day')`)).filter(record => record.fields.Classe?.includes(body.classId)).map(normalizeEducationRecord);
        const snapshot = records => records.map(record => ({ id: record.id, fields: record.fields })).sort((a, b) => a.id.localeCompare(b.id));
        if (canonical(snapshot(current)) !== canonical(snapshot(body.expected))) throw authError(409, 'Cet appel a changé. Actualisez avant de modifier.');
      }
      const records = [];
      for (const mark of body.marks) {
        if (!recordId(mark?.studentId) || !EDUCATION_OPTIONS.attendance['Présence'].includes(mark.status)) invalid('Présence invalide.');
        if (!members.has(mark.studentId)) invalid('Cet élève ne fait pas partie de cette classe.');
        records.push({ fields: { Appel: `${body.date}:${body.classId}:${mark.studentId}`, Date: body.date, Classe: [body.classId], 'Élève': [mark.studentId], 'Présence': mark.status } });
      }
      const saved = [];
      for (let offset = 0; offset < records.length; offset += 10) {
        const response = await queueEducationRequest(() => fetch(`https://api.airtable.com/v0/${EDUCATION_BASE}/${EDUCATION_ENTITIES.attendance.tableId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ['Appel'] }, records: records.slice(offset, offset + 10) }), signal: AbortSignal.timeout(20000) }));
        if (!response.ok) throw authError(503, 'Appel non confirmé. Actualisez avant de réessayer.');
        saved.push(...(await response.json()).records.map(normalizeEducationRecord));
      }
      return res.json({ records: saved });
    }
    if (req.method === 'POST' && body?.action === 'email') {
      if (!recordId(body.studentId) || !recordId(body.parentId) || typeof body.subject !== 'string' || !body.subject.trim() || body.subject.length > 300 || /[\r\n]/.test(body.subject) || typeof body.body !== 'string' || !body.body.trim() || body.body.length > 20000) invalid('Email invalide.');
      if (body.cc !== undefined && (typeof body.cc !== 'string' || body.cc.length > 254 || body.cc.trim() && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(body.cc.trim()))) invalid('Adresse email en copie (CC) invalide.');
      const cc = body.cc?.trim();
      if (body.requestId && !/^[A-Za-z0-9_-]{8,100}$/.test(body.requestId)) invalid('Identifiant envoi invalide.');
      const student = await request(`${EDUCATION_BASE}/${EDUCATION_ENTITIES.students.tableId}/${body.studentId}`);
      if (!student.fields.Parents?.includes(body.parentId)) invalid('Ce parent ne correspond pas à cet élève.');
      const parent = await request(`${EDUCATION_BASE}/${EDUCATION_ENTITIES.parents.tableId}/${body.parentId}`);
      const recipient = parent.fields.Email;
      if (typeof recipient !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) invalid('Ce parent ne possède pas un email valide.');
      let attachments = [];
      if (body.source) {
        if (!['results', 'events'].includes(body.source.entity) || !recordId(body.source.id)) invalid('Document invalide.');
        const source = await request(`${EDUCATION_BASE}/${EDUCATION_ENTITIES[body.source.entity].tableId}/${body.source.id}`);
        if (!source.fields['Élève']?.includes(body.studentId)) invalid('Le document ne correspond pas à cet élève.');
        attachments = (source.fields['Copies d’examen'] || []).filter(file => safeAttachmentUrl(file.url)).map(file => ({ path: file.url, filename: file.filename || 'copie.pdf' }));
      }
      if (!env.RESEND_API_KEY) throw authError(503, 'Envoi email non configuré.');
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(body.requestId ? { 'Idempotency-Key': `education-${body.requestId}` } : {}) }, body: JSON.stringify({ from: env.RESEND_FROM_CONTACT_Ecole || 'Ecole <maitre@jeexpert-study.com>', to: [recipient], ...(cc ? { cc: [cc] } : {}), subject: body.subject.trim(), text: body.body.trim(), ...(attachments.length ? { attachments } : {}) }), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw authError(503, 'Envoi email non confirmé.');
      return res.json({ success: true });
    }
    if (req.method === 'POST' && body?.action === 'upload') {
      const definition = EDUCATION_ENTITIES[body.entity];
      const field = definition?.fields.find(item => item.name === body.field && item.type === 'multipleAttachments');
      const file = body.file;
      if (!field || !recordId(body.id) || !file || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.contentType) || typeof file.filename !== 'string' || !file.filename.trim() || file.filename.length > 200 || /[\r\n\\/]/.test(file.filename) || typeof file.content !== 'string' || file.content.length > 4194304 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.content)) invalid('Fichier invalide (PDF ou image, maximum 3 Mo).');
      const bytes = Buffer.from(file.content, 'base64');
      if (!bytes.length || bytes.length > 3 * 1024 * 1024 || bytes.toString('base64') !== file.content) invalid('Fichier invalide.');
      if (body.field === 'Photo' && file.contentType === 'application/pdf') invalid('La photo doit être une image.');
      const path = `${EDUCATION_BASE}/${definition.tableId}/${body.id}`;
      const original = await request(path);
      if ((original.fields[body.field] || []).length >= (body.field === 'Photo' ? 1 : 10)) invalid(body.field === 'Photo' ? 'Supprimez la photo actuelle avant de la remplacer.' : 'Maximum 10 pièces jointes.');
      const response = await queueEducationRequest(() => fetch(`https://content.airtable.com/v0/${EDUCATION_BASE}/${body.id}/${encodeURIComponent(field.id || body.field)}/uploadAttachment`, { method: 'POST', headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: file.contentType, filename: file.filename, file: file.content }), signal: AbortSignal.timeout(30000) }));
      if (!response.ok) throw authError(503, 'Téléversement non confirmé. Actualisez avant de réessayer.');
      try { return res.json({ record: normalizeEducationRecord(await request(path)) }); }
      catch { throw authError(503, 'Le fichier a été envoyé, mais son affichage reste à actualiser. Actualisez avant tout nouvel envoi.'); }
    }
    if (!body || Object.keys(body).some(key => !['entity', 'id', 'fields', 'expected'].includes(key)) || !Object.hasOwn(EDUCATION_ENTITIES, body.entity) || req.method === 'PATCH' && !recordId(body.id) || req.method === 'POST' && body.id) invalid('Requête Education invalide.');
    const definition = EDUCATION_ENTITIES[body.entity], path = `${EDUCATION_BASE}/${definition.tableId}`;
    if (body.entity === 'attendance') invalid('Utilisez le calendrier pour enregistrer un appel.');
    const original = req.method === 'PATCH' ? await request(`${path}/${body.id}`) : { fields: {} };
    if (body.expected && canonical(editableSnapshot(definition, original.fields)) !== canonical(editableSnapshot(definition, body.expected))) throw authError(409, 'Ce dossier a changé. Actualisez avant de modifier.');
    const fields = validateEducationFields(body.entity, body.fields, original.fields, options[body.entity]);
    for (const field of definition.fields.filter(item => item.target && Object.hasOwn(fields, item.name))) {
      for (const id of fields[field.name]) await request(`${EDUCATION_BASE}/${EDUCATION_ENTITIES[field.target].tableId}/${id}`);
    }
    const record = await request(`${path}${req.method === 'PATCH' ? `/${body.id}` : ''}`, req.method, fields);
    return res.json({ record: normalizeEducationRecord(record) });
  } catch (error) { sendAuthError(res, error); }
}
