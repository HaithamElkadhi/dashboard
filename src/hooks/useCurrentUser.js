import { useCallback, useState } from 'react';
import { ASSIGNEES } from '../lib/config.js';

// Stand-in for identity: this app has no login/session system, so "current
// user" is just a locally remembered pick among the 3 known collaborators —
// used to personalize "Mes tâches" and the header avatar, not to gate access.
const KEY = 'jeexpert:currentUser';

export function useCurrentUser() {
  const [currentUser, setCurrentUserState] = useState(() => {
    if (typeof window === 'undefined') return ASSIGNEES[0];
    const saved = localStorage.getItem(KEY);
    return ASSIGNEES.includes(saved) ? saved : ASSIGNEES[0];
  });

  const setCurrentUser = useCallback((name) => {
    if (!ASSIGNEES.includes(name)) return;
    localStorage.setItem(KEY, name);
    setCurrentUserState(name);
  }, []);

  return [currentUser, setCurrentUser];
}
