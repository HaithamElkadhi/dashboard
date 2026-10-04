import BrandLogo from '../components/BrandLogo.jsx';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(username.trim(), password); }
    catch (err) { setError(err.message || 'Connexion impossible. Réessayez.'); }
    finally { setBusy(false); setPassword(''); }
  };
  return <main className="grid min-h-screen bg-canvas lg:grid-cols-2">
    <section className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex"><BrandLogo variant="white" className="w-64" /><div><BrandLogo variant="icon" className="mb-8 h-28 w-28 rounded-2xl" /><h2 className="max-w-md text-4xl font-semibold leading-tight">OUR EXPERTISE,<br />YOUR FUTURE</h2><p className="mt-6 text-accent">Clarity • Trust • Guidance</p></div><p className="text-sm text-white/80">JEEXPERT · Workspace</p></section>
    <div className="flex items-center justify-center px-6 py-12">
    <form onSubmit={submit} className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div><BrandLogo className="mb-6 w-52" /><h1 className="text-2xl font-semibold text-navy">Bienvenue</h1><p className="mt-2 text-sm text-text-muted">Connectez-vous pour accéder à votre espace de travail.</p></div>
      <div><label htmlFor="username" className="mb-2 block text-sm font-medium">Identifiant</label><input id="username" name="username" autoComplete="username" required maxLength={100} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-border-strong px-3 py-2.5 outline-none focus:border-navy" /></div>
      <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Mot de passe</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-border-strong px-3 py-2.5 outline-none focus:border-navy" /></div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-navy px-4 py-3 font-medium text-white disabled:opacity-50">{busy ? 'Connexion…' : 'Se connecter'}</button>
    </form>
    </div>
  </main>;
}
