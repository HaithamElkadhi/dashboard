import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardData, updateProspect, deleteProspect } from '../lib/airtable.js';

// Bump the version whenever a prospect gets new fields: an older cache is then
// dropped and the data re-fetched once, so new columns/filters aren't empty.
const CACHE_VERSION = 4;
const CACHE_KEY = `jeexpert:dashboard:v${CACHE_VERSION}`;

// True when a cache from an older version was found (and removed). Evaluated
// once per page load — not during render, where React may run it twice.
let outdatedCacheFound = null;
function hadOutdatedCache() {
  if (outdatedCacheFound === null) outdatedCacheFound = dropOutdatedCaches();
  return outdatedCacheFound;
}

function dropOutdatedCaches() {
  let found = false;
  try {
    for (let v = 1; v < CACHE_VERSION; v += 1) {
      const key = `jeexpert:dashboard:v${v}`;
      if (localStorage.getItem(key) != null) {
        localStorage.removeItem(key);
        found = true;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return found;
}

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
  const reloadOutdated = typeof window !== 'undefined' && !cached && hadOutdatedCache();

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

  // Only the fields edited via the popup form are patched here — a full
  // re-normalize would need the payment map too, and the payment totals
  // aren't part of this edit, so the rest of the row is left untouched.
  // The operator had data before this version — reload it once automatically
  // instead of showing the empty state.
  useEffect(() => {
    // Check the module flag, not just the render value: React may run this
    // effect twice in development, and the reload must happen only once.
    if (reloadOutdated && outdatedCacheFound) {
      outdatedCacheFound = false;
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    async (recordId, input) => {
      const patch = await updateProspect(recordId, input);
      setProspects((prev) => {
        const next = prev.map((p) =>
          p.id === recordId
            ? {
                ...p,
                fullName: patch.fullName || p.fullName,
                firstName: patch.firstName,
                lastName: patch.lastName,
                situations: patch.situations,
                admissionStatus: patch.admissionStatus,
                university: patch.approvedUniversity || p.university,
                scholarshipStatus: patch.scholarshipStatus,
                visaStatus: patch.visaStatus,
                visaAppointmentDate: patch.visaAppointmentDate,
                universitalyValidation: patch.universitalyValidation,
                scholarshipFolder: patch.scholarshipFolder,
                scholarshipType: patch.scholarshipType,
                scholarshipSubmissionDate: patch.scholarshipSubmissionDate,
                scholarshipPayment: patch.scholarshipPayment,
                scholarshipDDL: patch.scholarshipDDL,
                regionAuthority: patch.regionAuthority,
                intakeRaw: patch.intakeRaw,
                intakes: patch.intakes,
                dateLead: patch.dateLead,
                dateProspect: patch.dateProspect,
                dateCandidate: patch.dateCandidate,
                dateStudent: patch.dateStudent,
                dateLost: patch.dateLost,
              }
            : p
        );
        writeCache(next, schema, lastUpdated);
        return next;
      });
      return patch;
    },
    [schema, lastUpdated]
  );

  const remove = useCallback(
    async (recordId) => {
      await deleteProspect(recordId);
      setProspects((prev) => {
        const next = prev.filter((p) => p.id !== recordId);
        writeCache(next, schema, lastUpdated);
        return next;
      });
    },
    [schema, lastUpdated]
  );

  // Merge already-known values into one row (no Airtable call), e.g. the
  // proposal completeness after the proposal popup saved.
  const patchLocal = useCallback(
    (recordId, partial) => {
      setProspects((prev) => {
        const next = prev.map((p) => (p.id === recordId ? { ...p, ...partial } : p));
        writeCache(next, schema, lastUpdated);
        return next;
      });
    },
    [schema, lastUpdated]
  );

  return { prospects, schema, status, error, lastUpdated, refresh: load, update, remove, patchLocal };
}
