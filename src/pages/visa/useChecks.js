import { useCallback, useEffect, useState } from 'react';

/**
 * Checkbox state persisted per device as an { [itemId]: true } map.
 * Ids are stable strings so reordering the lists never shifts saved answers.
 */
export default function useChecks(storageKey) {
  const [checks, setChecks] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checks));
    } catch {
      /* quota or private mode — progress simply isn't persisted */
    }
  }, [storageKey, checks]);

  const toggle = useCallback((id) => {
    setChecks((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setChecks({});
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return { checks, toggle, clearAll };
}
