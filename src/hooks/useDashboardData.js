import { useCallback, useState } from 'react';
import { fetchDashboardData } from '../lib/airtable.js';

export function useDashboardData() {
  const [prospects, setProspects] = useState([]);
  const [schema, setSchema] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // No automatic fetch on mount: data is only loaded when the operator clicks
  // Refresh, to minimize backend calls.
  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { prospects, schema } = await fetchDashboardData();
      setProspects(prospects);
      setSchema(schema);
      setLastUpdated(new Date());
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  return { prospects, schema, status, error, lastUpdated, refresh: load };
}
