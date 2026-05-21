import {
  clearStoredAuthTokens,
  readStoredAuthTokens,
  readStoredUser,
  writeStoredAuthTokens,
} from '@/lib/auth-tokens-local';
import { refreshSessionViaGraphql } from '@/lib/refresh-session-graphql';
import { tryEstablishSession } from '@/lib/establish-session';

/**
 * Re-applies httpOnly session cookies from localStorage (and refreshes tokens if needed).
 * Call once on app load when the user may have lost cookies but still has stored tokens.
 */
export async function restoreAuthSessionFromLocalStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const pair = readStoredAuthTokens();
  if (!pair) return false;

  const cachedUser = readStoredUser();
  if (await tryEstablishSession(pair.access, pair.refresh, undefined, cachedUser ?? undefined)) {
    return true;
  }

  const rotated = await refreshSessionViaGraphql(pair.refresh);
  if (!rotated) {
    clearStoredAuthTokens();
    return false;
  }
  writeStoredAuthTokens(rotated.accessToken, rotated.refreshToken, rotated.expiresIn);
  const ok = await tryEstablishSession(
    rotated.accessToken,
    rotated.refreshToken,
    rotated.expiresIn ?? undefined,
    readStoredUser() ?? undefined
  );
  if (!ok) {
    clearStoredAuthTokens();
    return false;
  }
  return true;
}

const PROACTIVE_REFRESH_MS = 5 * 60 * 1000;

/** Rotate tokens and re-establish cookies (no-op if no refresh token). */
export async function silentRefreshAuthSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const pair = readStoredAuthTokens();
  if (!pair?.refresh) return false;
  const rotated = await refreshSessionViaGraphql(pair.refresh);
  if (!rotated) {
    clearStoredAuthTokens();
    return false;
  }
  writeStoredAuthTokens(rotated.accessToken, rotated.refreshToken, rotated.expiresIn);
  const ok = await tryEstablishSession(
    rotated.accessToken,
    rotated.refreshToken,
    rotated.expiresIn ?? undefined,
    readStoredUser() ?? undefined
  );
  if (!ok) {
    clearStoredAuthTokens();
    return false;
  }
  return true;
}

/** True if access token should be refreshed soon (within 5 minutes). */
export function shouldProactivelyRefreshAuth(): boolean {
  const u = readStoredUser();
  if (!u) return false;
  return u.expiresAt - Date.now() < PROACTIVE_REFRESH_MS;
}
