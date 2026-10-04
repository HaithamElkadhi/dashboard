import { useCallback, useEffect, useState } from 'react';

export default function useDocumentSettings(storageKey) {
  const [settings, setSettings] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value && typeof value === 'object').map(([id, value]) => [id, {
        hidden: value.hidden === true,
        note: typeof value.note === 'string' ? value.note.slice(0, 2000) : '',
      }]));
    } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Storage unavailable. */ }
  }, [storageKey, settings]);
  const setNote = useCallback((id, note) => setSettings(previous => ({ ...previous, [id]: { ...previous[id], note: note.slice(0, 2000) } })), []);
  const toggleHidden = useCallback(id => setSettings(previous => ({ ...previous, [id]: { ...previous[id], hidden: !previous[id]?.hidden } })), []);
  const restoreAll = useCallback(() => setSettings(previous => Object.fromEntries(Object.entries(previous).map(([id, value]) => [id, { ...value, hidden: false }]))), []);
  return { settings, setNote, toggleHidden, restoreAll };
}
