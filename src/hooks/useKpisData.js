import { useCallback, useEffect, useState } from 'react';
import { fetchKpiSnapshots } from '../lib/airtable.js';

const CACHE_KEY = 'jeexpert:kpis:v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.snapshots)) return null;
    return {
      snapshots: parsed.snapshots,
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
    };
  } catch {
    return null;
  }
}

function writeCache(snapshots, lastUpdated) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        snapshots,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      })
    );
  } catch {
    /* storage full or unavailable — ignore, cache is best-effort */
  }
}

// Mirrors useFinanceData / useBookingsData (auto-load once if nothing is
// cached), so the standalone Performance page shows data without requiring a
// manual refresh — HomePage's KPI card benefits from the same auto-load.
export function useKpisData() {
  const cached = typeof window !== 'undefined' ? readCache() : null;

  const [snapshots, setSnapshots] = useState(cached?.snapshots ?? []);
  const [status, setStatus] = useState(cached ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchKpiSnapshots();
      const now = new Date();
      setSnapshots(next);
      setLastUpdated(now);
      setStatus('ready');
      writeCache(next, now);
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!cached) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { snapshots, status, error, lastUpdated, refresh: load };
}
