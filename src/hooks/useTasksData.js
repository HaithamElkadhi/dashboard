import { useCallback, useEffect, useState } from 'react';
import {
  saveTicket,
  deleteTicket,
  fetchTasks,
  fetchPeopleForPicker,
  createTask,
  updateTask,
  deleteTask,
} from '../lib/airtable.js';


export function useTasksData() {
  const cached = null; // Protected data lives only in this mounted authenticated view.

  const [tasks, setTasks] = useState(cached?.tasks ?? []);
  const [people, setPeople] = useState(cached?.people ?? []);
  const [status, setStatus] = useState(cached ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [nextTasks, nextPeople] = await Promise.all([
        fetchTasks(),
        fetchPeopleForPicker(),
      ]);
      const now = new Date();
      setTasks(nextTasks);
      setPeople(nextPeople);
      setLastUpdated(now);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  // Auto-load once if nothing is cached (task board needs data immediately).
  useEffect(() => {
    if (!cached) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = useCallback(async (input) => {
    const created = await createTask(input);
    setTasks((prev) => {
      const next = [created, ...prev];
      return next;
    });
    return created;
  }, [people]);

  const update = useCallback(async (recordId, input) => {
    const updated = await updateTask(recordId, input);
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === recordId ? updated : t));
      return next;
    });
    return updated;
  }, [people]);

  const remove = useCallback(async (recordId) => {
    await deleteTask(recordId);
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== recordId);
      return next;
    });
  }, [people]);

  // Optimistic status change for drag-and-drop / one-click complete: the UI
  // updates instantly and rolls back if the Airtable write fails.
  const quickUpdateStatus = useCallback(async (recordId, status) => {
    let previous;
    setTasks((prev) => {
      previous = prev;
      return prev.map((t) => (t.id === recordId ? { ...t, status } : t));
    });
    try {
      const updated = await updateTask(recordId, { status });
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === recordId ? updated : t));
        return next;
      });
      return updated;
    } catch (err) {
      setTasks(previous);
      throw err;
    }
  }, [people]);

  const saveTicketRecord = useCallback(async (input, recordId, activity) => {
    const saved = await saveTicket(input, recordId, activity);
    setTasks((prev) => recordId ? prev.map((t) => t.id === recordId ? saved : t) : [saved, ...prev]);
    return saved;
  }, []);

  const deleteTicketRecord = useCallback(async (recordId, expected) => {
    const result = await deleteTicket(recordId, expected);
    setTasks(prev => prev.filter(t => t.id !== recordId));
    return result;
  }, []);
  return {
    deleteTicketRecord,
    saveTicketRecord,
    tasks,
    people,
    status,
    error,
    lastUpdated,
    refresh: load,
    create,
    update,
    remove,
    quickUpdateStatus,
  };
}
