import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Lets whichever page is currently mounted (Tasks, Prospects, Finance,
// Accounts…) register its own data's lastUpdated/refresh/loading so the
// single "Mis à jour" control in AppHeader always reflects the page you're
// actually looking at, instead of one page's data leaking into another's.
const PageRefreshContext = createContext(null);

const EMPTY = { lastUpdated: null, refresh: null, loading: false };

export function PageRefreshProvider({ children }) {
  const [info, setInfo] = useState(EMPTY);
  // Memoized so the context value's identity only changes when `info`
  // itself does — otherwise every render would hand consumers a new object,
  // and a registration effect keyed on it would re-fire forever.
  const value = useMemo(() => ({ info, setInfo }), [info]);
  return (
    <PageRefreshContext.Provider value={value}>{children}</PageRefreshContext.Provider>
  );
}

export function usePageRefreshRegistration({ lastUpdated, refresh, loading }) {
  const ctx = useContext(PageRefreshContext);
  const setInfo = ctx?.setInfo;
  useEffect(() => {
    if (!setInfo) return undefined;
    setInfo({ lastUpdated, refresh, loading: !!loading });
    return () => setInfo(EMPTY);
    // setInfo (the useState setter) is referentially stable, so this only
    // re-runs when the page's own data actually changes — not on every
    // provider render.
  }, [setInfo, lastUpdated, refresh, loading]);
}

export function usePageRefreshInfo() {
  const ctx = useContext(PageRefreshContext);
  return ctx?.info ?? EMPTY;
}
