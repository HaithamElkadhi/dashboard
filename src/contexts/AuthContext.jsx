import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import LoginPage from '../pages/LoginPage.jsx';
const AuthContext = createContext(null);
function clearCache() {
  try { for (const key of Object.keys(localStorage)) if (key.startsWith('jeexpert:')) localStorage.removeItem(key); } catch { /* Browser storage may be disabled. */ }
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const channel = useRef(null);
  const invalidate = useCallback((broadcast = true) => {
    generation.current += 1;
    clearCache();
    setUser(null);
    if (broadcast) channel.current?.postMessage('logout');
  }, []);
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const connection = new BroadcastChannel('jeexpert-auth');
    channel.current = connection;
    connection.onmessage = (event) => {
      if (event.data === 'logout') invalidate(false);
    };
    return () => { channel.current = null; connection.close(); };
  }, [invalidate]);
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input, window.location.href);
      const protectedApi = url.origin === window.location.origin && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/');
      const started = generation.current;
      const response = await originalFetch(input, init);
      if (protectedApi && response.status === 401 && started === generation.current) invalidate();
      if (protectedApi && started !== generation.current) throw new Error('Session expirée. Veuillez vous reconnecter.');
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, [invalidate]);
  const checkSession = useCallback(async () => {
    const started = generation.current;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      if (started !== generation.current) return;
      if (response.status === 401) { invalidate(); return; }
      if (!response.ok) throw new Error('Impossible de vérifier la session. Réessayez.');
      const data = await response.json();
      if (started === generation.current) setUser(data.user);
    } catch (err) {
      if (started === generation.current) setError(err.message);
    } finally { setLoading(false); }
  }, [invalidate]);
  useEffect(() => { checkSession(); }, [checkSession]);
  const login = async (username, password) => {
    const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Connexion impossible.');
    generation.current += 1;
    clearCache(); setUser(data.user);
  };
  const logout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok && response.status !== 401) throw new Error('Déconnexion impossible. Réessayez.');
    invalidate();
  };
  return <AuthContext.Provider value={{ user, login, logout }}>
    {loading ? <div className="flex min-h-screen items-center justify-center bg-canvas text-text-muted">Vérification de la session…</div>
      : error ? <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas"><p role="alert">{error}</p><button className="rounded-lg bg-navy px-5 py-2 text-white" onClick={checkSession}>Réessayer</button></div>
        : user ? children : <LoginPage />}
  </AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
