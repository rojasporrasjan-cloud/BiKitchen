import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getOfficialMenus } from '../utils/firestoreMenus';

const MenusContext = createContext(null);

export function MenusProvider({ children }) {
  const [menus, setMenus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastLoadRef = useRef(0);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastLoadRef.current < 120000 && menus) return;
    lastLoadRef.current = now;
    try {
      setLoading(true);
      setError(null);
      const data = await getOfficialMenus(force);
      setMenus(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [menus]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') load(false);
    };
    const onFocus = () => load(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const value = { menus, loading, error, refresh: (force = false) => load(force) };
  return <MenusContext.Provider value={value}>{children}</MenusContext.Provider>;
}

export function useMenus() {
  return useContext(MenusContext) || { menus: null, loading: false, error: null, refresh: () => {} };
}
