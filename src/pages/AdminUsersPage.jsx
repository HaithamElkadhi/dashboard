import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const inputClass = 'w-full rounded-lg border border-border-strong px-3 py-2.5 outline-none focus:border-navy disabled:opacity-50';

function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint8Array(32);
  let result = '';
  // Rejection sampling avoids bias when mapping random bytes to characters.
  while (result.length < 20) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < 256 - (256 % alphabet.length)) result += alphabet[byte % alphabet.length];
      if (result.length === 20) break;
    }
  }
  return result;
}

function UsersManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Editor');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async (signal) => {
    setLoading(true); setLoadError('');
    try {
      const response = await fetch('/api/admin/users', { credentials: 'same-origin', cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de charger les utilisateurs.');
      if (!signal?.aborted) setUsers(data.users);
    } catch (err) {
      if (!signal?.aborted) setLoadError(err.message);
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (password !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), displayName: displayName.trim(), password, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de créer cet utilisateur.');
      setUsers((current) => [...current, data.user].sort((a, b) => a.username.localeCompare(b.username)));
      setSuccess(`Le compte ${data.user.username} est créé. Il peut maintenant se connecter.`);
      setUsername(''); setDisplayName(''); setPassword(''); setConfirmation(''); setShowPassword(false);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold text-navy">Utilisateurs</h1><p className="mt-1 text-sm text-text-muted">Créez les accès de votre équipe au dashboard.</p></div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-label="Liste des utilisateurs">
        <h2 className="border-b border-border px-5 py-4 font-semibold text-navy">Comptes de l’équipe</h2>
        {loading ? <p role="status" className="p-5 text-sm text-text-muted">Chargement…</p> : loadError ? <div className="space-y-3 p-5"><p role="alert" className="text-sm text-red-600">{loadError}</p><button type="button" onClick={() => load()} className="rounded-lg bg-navy px-4 py-2 text-sm text-white">Réessayer</button></div> : users.length === 0 ? <p className="p-5 text-sm text-text-muted">Aucun utilisateur.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-canvas text-text-muted"><tr><th className="px-5 py-3">Utilisateur</th><th className="px-5 py-3">Rôle</th><th className="px-5 py-3">Statut</th></tr></thead><tbody>{users.map((account) => <tr key={account.id} className="border-t border-border"><td className="px-5 py-4"><p className="font-medium text-navy">{account.displayName}</p><p className="mt-1 text-xs text-text-muted">{account.username}</p></td><td className="px-5 py-4">{user.isAdmin ? <select data-write="" aria-label={'Role for ' + account.username} value={account.role} disabled={busy || account.id === user.id} onChange={async event => { const role = event.target.value; setBusy(true); setError(''); try { const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: account.id, role }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setUsers(current => current.map(item => item.id === account.id ? data.user : item)); } catch (err) { setError(err.message); } finally { setBusy(false); } }} className={inputClass}>{['Admin', 'Editor', 'View'].map(role => <option key={role}>{role}</option>)}</select> : account.role}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${account.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{account.isActive ? 'Actif' : 'Désactivé'}</span></td></tr>)}</tbody></table></div>}
      </section>
      {user.isAdmin && <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div><h2 className="font-semibold text-navy">Créer un utilisateur</h2><p className="mt-1 text-sm text-text-muted">View : consultation uniquement. Editor : modifications. Admin : gestion des accès.</p></div>
        <fieldset disabled={busy} className="space-y-4">
          <div><label htmlFor="admin-role" className="mb-2 block text-sm font-medium">Role</label><select id="admin-role" value={role} onChange={event => setRole(event.target.value)} className={inputClass}>{['Editor', 'View', 'Admin'].map(value => <option key={value}>{value}</option>)}</select></div>
          <div><label htmlFor="admin-username" className="mb-2 block text-sm font-medium">Identifiant</label><input id="admin-username" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={64} pattern="[A-Za-z0-9._-]+" value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} /><p className="mt-1 text-xs text-text-muted">Identifiant unique : lettres, chiffres, points ou tirets, sans espaces.</p></div>
          <div><label htmlFor="admin-name" className="mb-2 block text-sm font-medium">Nom affiché</label><input id="admin-name" name="displayName" autoComplete="off" required maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></div>
          <div><label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Mot de passe</label><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /><p className="mt-1 text-xs text-text-muted">Entre 12 et 256 caractères. Transmettez-le à la personne par un canal privé.</p></div>
          <div><label htmlFor="admin-confirmation" className="mb-2 block text-sm font-medium">Confirmer le mot de passe</label><input id="admin-confirmation" name="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={256} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} /></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />Afficher</label><button data-write="" type="button" onClick={() => { const generated = makePassword(); setPassword(generated); setConfirmation(generated); setShowPassword(true); }} className="rounded-lg border border-border-strong px-3 py-2 text-sm text-navy hover:bg-canvas">Générer un mot de passe</button></div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="text-sm text-green-700">{success}</p>}
        <button data-write="" type="submit" disabled={busy} className="w-full rounded-lg bg-navy px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Création…' : 'Créer le compte'}</button>
      </form>}
    </div>
  </div>;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  return user?.isAdmin || user?.role === 'View' ? <UsersManager /> : <Navigate to="/" replace />;
}
