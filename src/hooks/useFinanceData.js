import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchPaiements,
  fetchPeopleForPicker,
  fetchPaiementChoices,
  createPaiement,
  updatePaiement,
  deletePaiement,
} from '../lib/airtable.js';
import {
  PURPOSE_CHOICES,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLORS,
  CURRENCIES,
  MOEZ_TYPES,
} from '../lib/config.js';
import { softChipStyle } from '../lib/colors.js';

const CACHE_KEY = 'jeexpert:finance:v3';

const FALLBACK_CHOICES = {
  statuses: PAYMENT_STATUSES.map((name) => ({ name, color: null })),
  currencies: CURRENCIES,
  purposes: PURPOSE_CHOICES,
  moezTypes: MOEZ_TYPES,
};

// Per-list fallback: an empty list from the schema (field missing/renamed)
// falls back to the static one rather than leaving a select with no options.
function withFallbacks(choices) {
  const out = {};
  for (const key of Object.keys(FALLBACK_CHOICES)) {
    out[key] = choices?.[key]?.length ? choices[key] : FALLBACK_CHOICES[key];
  }
  return out;
}

// Badge color per status: Airtable's configured color when known, else the
// hand-picked palette, else neutral (handled by the caller).
function buildStatusColors(statuses) {
  const map = {};
  for (const { name, color } of statuses) {
    const c = softChipStyle(color) || PAYMENT_STATUS_COLORS[name];
    if (c) map[name] = c;
  }
  return map;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.paiements)) return null;
    return {
      paiements: parsed.paiements,
      people: Array.isArray(parsed.people) ? parsed.people : [],
      choices: parsed.choices || null,
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
    };
  } catch {
    return null;
  }
}

function writeCache(paiements, people, choices, lastUpdated) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        paiements,
        people,
        choices,
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
  const [choices, setChoices] = useState(() => withFallbacks(cached?.choices));
  const [status, setStatus] = useState(cached ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [nextPaiements, nextPeople, fetchedChoices] = await Promise.all([
        fetchPaiements(),
        fetchPeopleForPicker(),
        fetchPaiementChoices().catch(() => null), // best-effort
      ]);
      const nextChoices = withFallbacks(fetchedChoices);
      const now = new Date();
      setPaiements(nextPaiements);
      setPeople(nextPeople);
      setChoices(nextChoices);
      setLastUpdated(now);
      setStatus('ready');
      writeCache(nextPaiements, nextPeople, nextChoices, now);
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
        writeCache(next, people, choices, new Date());
        return next;
      });
      return created;
    },
    [people, choices]
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
          writeCache(next, people, choices, new Date());
          return next;
        });
        return updated;
      } catch (err) {
        setPaiements(previous);
        throw err;
      }
    },
    [people, choices]
  );

  const remove = useCallback(
    async (recordId) => {
      await deletePaiement(recordId);
      setPaiements((prev) => {
        const next = prev.filter((p) => p.id !== recordId);
        writeCache(next, people, choices, new Date());
        return next;
      });
    },
    [people, choices]
  );

  const statusColors = useMemo(() => buildStatusColors(choices.statuses), [choices]);
  const statusChoices = useMemo(() => choices.statuses.map((c) => c.name), [choices]);

  return {
    paiements,
    people,
    purposeChoices: choices.purposes,
    statusChoices,
    statusColors,
    currencyChoices: choices.currencies,
    moezTypeChoices: choices.moezTypes,
    status,
    error,
    lastUpdated,
    refresh: load,
    create,
    update,
    remove,
  };
}
