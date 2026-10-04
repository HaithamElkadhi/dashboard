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


export function useAccountsData() {
  const cached = null; // Protected data lives only in this mounted authenticated view.

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
