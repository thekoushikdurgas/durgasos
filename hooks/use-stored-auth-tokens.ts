'use client';

import { useEffect, useMemo, useState } from 'react';

import { AUTH_SESSION_CHANGED_EVENT } from '@/lib/auth-session-events';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';

/** Stable cache key for useSyncExternalStore / React comparisons. */
export function storedAuthTokensKey(): string {
  const t = readStoredAuthTokens();
  if (!t) return '';
  return `${t.access}\u0000${t.refresh}`;
}

/** Reactive read of the JWT pair in localStorage (updates on login/logout/refresh). */
export function useStoredAuthTokens() {
  const [key, setKey] = useState(() => storedAuthTokensKey());

  useEffect(() => {
    const sync = () => setKey(storedAuthTokensKey());
    sync();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return useMemo(() => readStoredAuthTokens(), [key]);
}
