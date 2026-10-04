import { airtable, USERS_TABLE, requireAdmin, checkOrigin, hashPassword, publicUser, authError, sendAuthError } from '../_lib/auth.js';
const pendingUsernames = new Set();

export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    if (req.method === 'POST') checkOrigin(req, env);
    await requireAdmin(req, env);
    if (req.method === 'GET') {
      const users = [];
      let offset;
      do {
        const params = new URLSearchParams({ pageSize: '100' });
        for (const field of ['username', 'display_name', 'is_active', 'is_admin']) params.append('fields[]', field);
        if (offset) params.set('offset', offset);
        const page = await airtable(`${USERS_TABLE}?${params}`, { env });
        users.push(...page.records.map(publicUser));
        offset = page.offset;
      } while (offset);
      users.sort((a, b) => String(a.username).localeCompare(String(b.username)));
      return res.json({ users });
    }
    const { username: rawUsername, displayName: rawName, password } = req.body || {};
    const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : '';
    const displayName = typeof rawName === 'string' ? rawName.trim() : '';
    if (!/^[a-z0-9._-]{1,64}$/.test(username)) throw authError(400, 'Identifiant : 1 à 64 lettres, chiffres, points, tirets ou underscores.');
    if (!displayName || displayName.length > 100) throw authError(400, 'Le nom affiché doit contenir 1 à 100 caractères.');
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw authError(400, 'Le mot de passe doit contenir 12 à 256 caractères.');
    if (pendingUsernames.has(username)) throw authError(409, 'La création de cet identifiant est déjà en cours.');
    pendingUsernames.add(username);
    try {
    const params = new URLSearchParams({ filterByFormula: `{username}='${username}'`, maxRecords: '2', 'fields[]': 'username' });
    const existing = await airtable(`${USERS_TABLE}?${params}`, { env });
    if (existing.records.length) throw authError(409, 'Cet identifiant existe déjà.');
    const password_hash = await hashPassword(password);
    const record = await airtable(USERS_TABLE, { method: 'POST', env, body: { fields: {
      username, display_name: displayName, password_hash, is_active: true, is_admin: false,
    } } });
    const verified = await airtable(`${USERS_TABLE}?${params}`, { env });
    if (verified.records.length !== 1 || verified.records[0].id !== record.id) {
      await airtable(`${USERS_TABLE}/${record.id}`, { method: 'DELETE', env });
      throw authError(409, 'Cet identifiant a été créé simultanément. Actualisez la liste avant de réessayer.');
    }
    res.status(201).json({ user: publicUser(record) });
    } finally { pendingUsernames.delete(username); }
  } catch (error) { sendAuthError(res, error); }
}
