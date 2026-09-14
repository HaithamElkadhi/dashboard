import { useCallback, useEffect, useState } from 'react';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseInvoice,
} from '../lib/airtable.js';

async function withInvoiceUploads(record, files) {
  if (!files?.length) return record;
  let current = record;
  for (const file of files) {
    // uploadAttachment responses only include the attachment field — merge
    // so we don't wipe description/amount/etc. from local state.
    const uploaded = await uploadExpenseInvoice(current.id, file);
    current = {
      ...current,
      invoices: uploaded.invoices?.length ? uploaded.invoices : current.invoices,
    };
  }
  return current;
}

export function useExpensesData() {
  const [expenses, setExpenses] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchExpenses();
      const now = new Date();
      setExpenses(next);
      setLastUpdated(now);
      setStatus('ready');
      setLoaded(true);
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  // Fetch once on mount; keep in memory for the session (no re-fetch on tab switch).
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const create = useCallback(async (input) => {
    const { files, ...fields } = input;
    const created = await createExpense(fields);
    const withFiles = await withInvoiceUploads(created, files);
    setExpenses((prev) => [withFiles, ...prev]);
    return withFiles;
  }, []);

  const update = useCallback(async (recordId, input) => {
    const { files, ...fields } = input;
    const updated = await updateExpense(recordId, fields);
    const withFiles = await withInvoiceUploads(updated, files);
    setExpenses((prev) => prev.map((e) => (e.id === recordId ? withFiles : e)));
    return withFiles;
  }, []);

  const remove = useCallback(async (recordId) => {
    await deleteExpense(recordId);
    setExpenses((prev) => prev.filter((e) => e.id !== recordId));
    return recordId;
  }, []);

  return {
    expenses,
    status,
    error,
    lastUpdated,
    refresh: load,
    create,
    update,
    remove,
  };
}
