import { useCallback, useEffect, useState } from 'react';
import {
  fetchTasks,
  fetchPeopleForPicker,
  createTask,
  updateTask,
  deleteTask,
} from '../lib/airtable.js';

const CACHE_KEY = 'jeexpert:tasks:v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tasks)) return null;
    return {
      tasks: parsed.tasks,
      people: Array.isArray(parsed.people) ? parsed.people : [],
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
    };
  } catch {
    return null;
  }
}

function writeCache(tasks, people, lastUpdated) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        tasks,
        people,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      })
    );
  } catch {
    /* best-effort */
  }
}

export function useTasksData() {
  const cached = typeof window !== 'undefined' ? readCache() : null;

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
      writeCache(nextTasks, nextPeople, now);
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
      writeCache(next, people, new Date());
      return next;
    });
    return created;
  }, [people]);

  const update = useCallback(async (recordId, input) => {
    const updated = await updateTask(recordId, input);
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === recordId ? updated : t));
      writeCache(next, people, new Date());
      return next;
    });
    return updated;
  }, [people]);

  const remove = useCallback(async (recordId) => {
    await deleteTask(recordId);
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== recordId);
      writeCache(next, people, new Date());
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
        writeCache(next, people, new Date());
        return next;
      });
      return updated;
    } catch (err) {
      setTasks(previous);
      throw err;
    }
  }, [people]);

  return {
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
