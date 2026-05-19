'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import { AUTH_SESSION_CHANGED_EVENT } from '@/lib/auth-session-events';
import { restoreAuthSessionFromLocalStorage } from '@/lib/restore-auth-session';

type AuthSessionContextValue = {
  ready: boolean;
  authenticated: boolean;
  recheck: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

async function fetchAuthenticated(): Promise<boolean> {
  try {
    const r = await fetch('/api/auth/session', { credentials: 'include' });
    if (!r.ok) return false;
    const j = (await r.json()) as { authenticated?: boolean };
    return Boolean(j.authenticated);
  } catch {
    return false;
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const recheck = useCallback(async () => {
    let ok = await fetchAuthenticated();
    if (!ok) {
      await new Promise((r) => setTimeout(r, 80));
      ok = await fetchAuthenticated();
    }
    setAuthenticated(ok);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hadRestore = await restoreAuthSessionFromLocalStorage();
      if (hadRestore) router.refresh();
      if (!cancelled) {
        let ok = await fetchAuthenticated();
        if (!ok && hadRestore) {
          await new Promise((r) => setTimeout(r, 120));
          ok = await fetchAuthenticated();
        }
        if (!cancelled) {
          setAuthenticated(ok);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const onChange = () => void recheck();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onChange);
  }, [recheck]);

  const value = useMemo(() => ({ ready, authenticated, recheck }), [ready, authenticated, recheck]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const v = useContext(AuthSessionContext);
  if (!v) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return v;
}
