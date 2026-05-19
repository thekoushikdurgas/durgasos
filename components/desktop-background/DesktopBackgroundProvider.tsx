'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  DEFAULT_DESKTOP_BACKGROUND_ID,
  DESKTOP_BACKGROUND_STORAGE_KEY,
  getDesktopBackgroundSnapshot,
  notifyDesktopBackgroundListeners,
  subscribeDesktopBackground,
  type DesktopBackgroundId,
} from '@/lib/desktop-background-storage';
import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

export type DesktopBackgroundContextValue = {
  backgroundId: DesktopBackgroundId;
  setBackgroundId: (id: DesktopBackgroundId) => void;
};

const DesktopBackgroundContext = createContext<DesktopBackgroundContextValue | null>(null);

export function DesktopBackgroundProvider({ children }: { children: ReactNode }) {
  const backgroundId = useSyncExternalStore(
    subscribeDesktopBackground,
    getDesktopBackgroundSnapshot,
    () => DEFAULT_DESKTOP_BACKGROUND_ID
  );

  const setBackgroundId = useCallback((id: DesktopBackgroundId) => {
    try {
      localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, id);
    } catch {
      /* quota / private mode */
    }
    localCache.set('desktop_background', id, CACHE_TTL_MS.desktop_background);
    notifyDesktopBackgroundListeners();
  }, []);

  const value = useMemo(() => ({ backgroundId, setBackgroundId }), [backgroundId, setBackgroundId]);

  return (
    <DesktopBackgroundContext.Provider value={value}>{children}</DesktopBackgroundContext.Provider>
  );
}

export function useDesktopBackground(): DesktopBackgroundContextValue {
  const ctx = useContext(DesktopBackgroundContext);
  if (!ctx) {
    throw new Error('useDesktopBackground must be used within DesktopBackgroundProvider');
  }
  return ctx;
}
