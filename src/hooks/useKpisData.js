import { useCallback, useEffect, useState } from 'react';
import { fetchKpiSnapshots } from '../lib/airtable.js';


// Mirrors useFinanceData / useBookingsData (auto-load once if nothing is
// cached), so the standalone Performance page shows data without requiring a
// manual refresh — HomePage's KPI card benefits from the same auto-load.
export function useKpisData() {
  const cached = null; // Protected data lives only in this mounted authenticated view.

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
