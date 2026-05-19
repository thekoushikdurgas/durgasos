import { print } from 'graphql';

import {
  clearStoredAuthTokens,
  readStoredAuthTokens,
  writeStoredAuthTokens,
} from '@/lib/auth-tokens-local';
import { getGraphqlHttpUrl } from '@/lib/backend-url';
import { REFRESH_SESSION } from '@/lib/graphql-auth';
import { tryEstablishSession } from '@/lib/establish-session';

type RefreshResponse = {
  data?: {
    refreshSession?: {
      success?: boolean;
      session?: {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number | null;
      } | null;
    } | null;
  };
};

async function refreshViaGraphql(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number | null | undefined;
} | null> {
  const res = await fetch(getGraphqlHttpUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      query: print(REFRESH_SESSION),
      variables: { refreshToken },
    }),
  });
  if (!res.ok) return null;
  const raw = await res.text();
  if (!raw.trimStart().startsWith('{')) {
    return null;
  }
  const json = JSON.parse(raw) as RefreshResponse;
  const payload = json.data?.refreshSession;
  const sess = payload?.session;
  if (!payload?.success || !sess?.accessToken || !sess?.refreshToken) return null;
  return {
    accessToken: sess.accessToken,
    refreshToken: sess.refreshToken,
    expiresIn: sess.expiresIn,
  };
}

/**
 * Re-applies httpOnly session cookies from localStorage (and refreshes tokens if needed).
 * Call once on app load when the user may have lost cookies but still has stored tokens.
 */
export async function restoreAuthSessionFromLocalStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const pair = readStoredAuthTokens();
  if (!pair) return false;

  if (await tryEstablishSession(pair.access, pair.refresh)) {
    return true;
  }

  const rotated = await refreshViaGraphql(pair.refresh);
  if (!rotated) {
    clearStoredAuthTokens();
    return false;
  }
  writeStoredAuthTokens(rotated.accessToken, rotated.refreshToken);
  const ok = await tryEstablishSession(
    rotated.accessToken,
    rotated.refreshToken,
    rotated.expiresIn ?? undefined
  );
  if (!ok) {
    clearStoredAuthTokens();
    return false;
  }
  return true;
}
