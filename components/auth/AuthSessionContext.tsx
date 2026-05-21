'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import { AUTH_SESSION_CHANGED_EVENT, notifyAuthSessionChanged } from '@/lib/auth-session-events';
import {
  mergeStoredUser,
  readStoredAuthTokens,
  readStoredUser,
  isStoredUserSessionValid,
  type StoredUser,
} from '@/lib/auth-tokens-local';
import { userClaimsFromAccessToken } from '@/lib/jwt-user-from-access';
import { rehydrateAuthTokensFromCookies } from '@/lib/rehydrate-auth-from-cookies';
import {
  restoreAuthSessionFromLocalStorage,
  shouldProactivelyRefreshAuth,
  silentRefreshAuthSession,
} from '@/lib/restore-auth-session';

type AuthSessionContextValue = {
  ready: boolean;
  authenticated: boolean;
  user: StoredUser | null;
  recheck: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function readInstantAuthState(): {
  ready: boolean;
  authenticated: boolean;
  user: StoredUser | null;
} {
  if (typeof window === 'undefined') {
    return { ready: false, authenticated: false, user: null };
  }
  const user = readStoredUser();
  const tokens = readStoredAuthTokens();
  const instant = Boolean(user && tokens && isStoredUserSessionValid());
  return {
    ready: instant,
    authenticated: instant,
    user: instant ? user : null,
  };
}

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
  const rehydrateAttemptedRef = useRef(false);
  const [ready, setReady] = useState(() => readInstantAuthState().ready);
  const [authenticated, setAuthenticated] = useState(() => readInstantAuthState().authenticated);
  const [user, setUser] = useState<StoredUser | null>(() => readInstantAuthState().user);

  const maybeRehydrateTokens = useCallback(async (): Promise<boolean> => {
    if (readStoredAuthTokens()) return true;
    if (rehydrateAttemptedRef.current) return false;
    rehydrateAttemptedRef.current = true;
    return rehydrateAuthTokensFromCookies();
  }, []);

  const recheck = useCallback(async () => {
    let ok = await fetchAuthenticated();
    if (!ok) {
      await new Promise((r) => setTimeout(r, 80));
      ok = await fetchAuthenticated();
    }
    if (!ok && readStoredAuthTokens()) {
      const restored = await restoreAuthSessionFromLocalStorage();
      if (restored) {
        ok = await fetchAuthenticated();
        if (ok) notifyAuthSessionChanged();
      }
    }
    if (ok && !readStoredAuthTokens()) {
      const rehydrated = await maybeRehydrateTokens();
      if (rehydrated && readStoredAuthTokens()) {
        notifyAuthSessionChanged();
      }
    }
    setAuthenticated(ok);
    setUser(ok ? readStoredUser() : null);
    setReady(true);
    if (ok && readStoredAuthTokens() && !readStoredUser()) {
      const access = readStoredAuthTokens()?.access;
      const claims = access ? userClaimsFromAccessToken(access) : null;
      if (claims) {
        mergeStoredUser({ id: claims.id, email: claims.email });
        setUser(readStoredUser());
      }
    }
  }, [maybeRehydrateTokens]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let hadRestore = await restoreAuthSessionFromLocalStorage();
      if (hadRestore) {
        notifyAuthSessionChanged();
        router.refresh();
      }

      let cookieOk = await fetchAuthenticated();
      if (cookieOk && !readStoredAuthTokens()) {
        const rehydrated = await maybeRehydrateTokens();
        if (rehydrated && readStoredAuthTokens()) {
          hadRestore = true;
          notifyAuthSessionChanged();
        }
      }

      if (shouldProactivelyRefreshAuth() && readStoredAuthTokens()) {
        const refreshed = await silentRefreshAuthSession();
        if (!cancelled && refreshed) {
          setUser(readStoredUser());
        }
      }

      if (!cancelled) {
        let ok = await fetchAuthenticated();
        if (!ok && hadRestore) {
          await new Promise((r) => setTimeout(r, 120));
          ok = await fetchAuthenticated();
        }
        if (!cancelled) {
          setAuthenticated(ok);
          setUser(ok ? readStoredUser() : null);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, maybeRehydrateTokens]);

  useEffect(() => {
    if (!authenticated || !user) return;
    const tick = () => {
      if (!shouldProactivelyRefreshAuth()) return;
      void (async () => {
        const ok = await silentRefreshAuthSession();
        if (ok) {
          setUser(readStoredUser());
          notifyAuthSessionChanged();
        }
      })();
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [authenticated, user]);

  useEffect(() => {
    const onChange = () => void recheck();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onChange);
  }, [recheck]);

  const value = useMemo(
    () => ({ ready, authenticated, user, recheck }),
    [ready, authenticated, user, recheck]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const v = useContext(AuthSessionContext);
  if (!v) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return v;
}
