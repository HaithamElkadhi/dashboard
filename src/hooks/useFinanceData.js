import { useCallback, useEffect, useState } from 'react';
import {
  fetchPaiements,
  fetchPeopleForPicker,
  fetchPurposeChoices,
  createPaiement,
  updatePaiement,
} from '../lib/airtable.js';
import { PURPOSE_CHOICES } from '../lib/config.js';

const CACHE_KEY = 'jeexpert:finance:v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.paiements)) return null;
    return {
      paiements: parsed.paiements,
      people: Array.isArray(parsed.people) ? parsed.people : [],
      purposeChoices: Array.isArray(parsed.purposeChoices)
        ? parsed.purposeChoices
        : [],
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
    };
  } catch {
    return null;
  }
}

function writeCache(paiements, people, purposeChoices, lastUpdated) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        paiements,
        people,
        purposeChoices,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      })
    );
  } catch {
    /* best-effort */
  }
}

export function useFinanceData() {
  const cached = typeof window !== 'undefined' ? readCache() : null;

  const [paiements, setPaiements] = useState(cached?.paiements ?? []);
  const [people, setPeople] = useState(cached?.people ?? []);
  const [purposeChoices, setPurposeChoices] = useState(
    cached?.purposeChoices?.length ? cached.purposeChoices : PURPOSE_CHOICES
  );
  const [status, setStatus] = useState(cached ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [nextPaiements, nextPeople, nextPurposeChoices] = await Promise.all([
        fetchPaiements(),
        fetchPeopleForPicker(),
        fetchPurposeChoices().catch(() => PURPOSE_CHOICES), // best-effort
      ]);
      const now = new Date();
      setPaiements(nextPaiements);
      setPeople(nextPeople);
      setPurposeChoices(nextPurposeChoices);
      setLastUpdated(now);
      setStatus('ready');
      writeCache(nextPaiements, nextPeople, nextPurposeChoices, now);
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  // Auto-load once if nothing is cached.
  useEffect(() => {
    if (!cached) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = useCallback(
    async (input) => {
      const created = await createPaiement(input);
      setPaiements((prev) => {
        const next = [created, ...prev];
        writeCache(next, people, purposeChoices, new Date());
        return next;
      });
      return created;
    },
    [people, purposeChoices]
  );

  const update = useCallback(
    async (recordId, input) => {
      // Optimistic: reflect the change immediately so the UI never waits on
      // the Airtable round-trip. Reconciled with the authoritative record
      // (recalculated formulas like Net/Commission Moez) once it resolves,
      // and rolled back if the write fails.
      let previous;
      setPaiements((prev) => {
        previous = prev;
        return prev.map((p) => (p.id === recordId ? { ...p, ...input } : p));
      });
      try {
        const updated = await updatePaiement(recordId, input);
        setPaiements((prev) => {
          const next = prev.map((p) => (p.id === recordId ? updated : p));
          writeCache(next, people, purposeChoices, new Date());
          return next;
        });
        return updated;
      } catch (err) {
        setPaiements(previous);
        throw err;
      }
    },
    [people, purposeChoices]
  );

  return {
    paiements,
    people,
    purposeChoices,
    status,
    error,
    lastUpdated,
    refresh: load,
    create,
    update,
  };
}
