import { useCallback, useEffect, useState } from 'react';
import {
  fetchProspectsForAccounts,
  fetchAccounts,
  fetchAccountSelectChoices,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../lib/airtable.js';
import { ACCOUNT_LABELS, DELEGATION_CHOICES } from '../lib/config.js';

const CACHE_KEY = 'jeexpert:accounts:v2';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.prospects) || !Array.isArray(parsed.accounts)) {
      return null;
    }
    return {
      prospects: parsed.prospects,
      accounts: parsed.accounts,
      labelChoices: Array.isArray(parsed.labelChoices) ? parsed.labelChoices : [],
      delegationChoices: Array.isArray(parsed.delegationChoices)
        ? parsed.delegationChoices
        : [],
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
    };
  } catch {
    return null;
  }
}

function writeCache(prospects, accounts, labelChoices, delegationChoices, lastUpdated) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        prospects,
        accounts,
        labelChoices,
        delegationChoices,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      })
    );
  } catch {
    /* best-effort */
  }
}

export function useAccountsData() {
  const cached = typeof window !== 'undefined' ? readCache() : null;

  const [prospects, setProspects] = useState(cached?.prospects ?? []);
  const [accounts, setAccounts] = useState(cached?.accounts ?? []);
  const [labelChoices, setLabelChoices] = useState(
    cached?.labelChoices?.length ? cached.labelChoices : ACCOUNT_LABELS
  );
  const [delegationChoices, setDelegationChoices] = useState(
    cached?.delegationChoices?.length ? cached.delegationChoices : DELEGATION_CHOICES
  );
  const [status, setStatus] = useState(cached ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [nextProspects, nextAccounts, selectChoices] = await Promise.all([
        fetchProspectsForAccounts(),
        fetchAccounts(),
        fetchAccountSelectChoices().catch(() => ({
          labels: ACCOUNT_LABELS,
          delegations: DELEGATION_CHOICES,
        })),
      ]);
      const nextLabels = selectChoices.labels?.length
        ? selectChoices.labels
        : ACCOUNT_LABELS;
      const nextDelegations = selectChoices.delegations?.length
        ? selectChoices.delegations
        : DELEGATION_CHOICES;
      const now = new Date();
      setProspects(nextProspects);
      setAccounts(nextAccounts);
      setLabelChoices(nextLabels);
      setDelegationChoices(nextDelegations);
      setLastUpdated(now);
      setStatus('ready');
      writeCache(nextProspects, nextAccounts, nextLabels, nextDelegations, now);
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
      const created = await createAccount(input);
      setAccounts((prev) => {
        const next = [created, ...prev];
        writeCache(prospects, next, labelChoices, delegationChoices, new Date());
        return next;
      });
      return created;
    },
    [prospects, labelChoices, delegationChoices]
  );

  const update = useCallback(
    async (recordId, input) => {
      const updated = await updateAccount(recordId, input);
      setAccounts((prev) => {
        const next = prev.map((a) => (a.id === recordId ? updated : a));
        writeCache(prospects, next, labelChoices, delegationChoices, new Date());
        return next;
      });
      return updated;
    },
    [prospects, labelChoices, delegationChoices]
  );

  const remove = useCallback(
    async (recordId) => {
      await deleteAccount(recordId);
      setAccounts((prev) => {
        const next = prev.filter((a) => a.id !== recordId);
        writeCache(prospects, next, labelChoices, delegationChoices, new Date());
        return next;
      });
    },
    [prospects, labelChoices, delegationChoices]
  );

  return {
    prospects,
    accounts,
    labelChoices,
    delegationChoices,
    status,
    error,
    lastUpdated,
    refresh: load,
    create,
    update,
    remove,
  };
}
