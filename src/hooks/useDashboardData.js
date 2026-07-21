import { useCallback, useState } from 'react';
import { fetchDashboardData } from '../lib/airtable.js';

const CACHE_KEY = 'jeexpert:dashboard:v1';

// Load any previously fetched data from localStorage so a browser refresh keeps
// showing the last snapshot instead of going back to the empty state. This
// avoids extra backend calls — data is only re-fetched on an explicit Refresh.
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.prospects)) return null;
    return {
      prospects: parsed.prospects,
      schema: parsed.schema ?? null,
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
    };
  } catch {
    return null;
  }
}

function writeCache(prospects, schema, lastUpdated) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        prospects,
        schema,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      })
    );
  } catch {
    /* storage full or unavailable — ignore, cache is best-effort */
  }
}

export function useDashboardData() {
  // Hydrate synchronously from cache (runs once) so there's no empty flash.
  const cached = typeof window !== 'undefined' ? readCache() : null;

  const [prospects, setProspects] = useState(cached?.prospects ?? []);
  const [schema, setSchema] = useState(cached?.schema ?? null);
  const [status, setStatus] = useState(cached ? 'ready' : 'idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  // No automatic network fetch on mount: data is either restored from cache or
  // loaded only when the operator clicks Refresh, to minimize backend calls.
  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { prospects, schema } = await fetchDashboardData();
      const now = new Date();
      setProspects(prospects);
      setSchema(schema);
      setLastUpdated(now);
      setStatus('ready');
      writeCache(prospects, schema, now);
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  return { prospects, schema, status, error, lastUpdated, refresh: load };
}
