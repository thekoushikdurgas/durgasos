'use client';

import { useEffect, useState } from 'react';

import { AUTH_SESSION_CHANGED_EVENT } from '@/lib/auth-session-events';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';

/** Reactive read of the JWT pair in localStorage (updates on login/logout/refresh). */
export function useStoredAuthTokens() {
  const [tokens, setTokens] = useState(() => readStoredAuthTokens());

  useEffect(() => {
    const sync = () => setTokens(readStoredAuthTokens());
    sync();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return tokens;
}
