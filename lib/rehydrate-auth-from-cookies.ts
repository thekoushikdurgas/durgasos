'use client';

import { readStoredAuthTokens, readStoredUser } from '@/lib/auth-tokens-local';
import { tryEstablishSession, type EstablishSessionUserInput } from '@/lib/establish-session';
import { userClaimsFromAccessToken } from '@/lib/jwt-user-from-access';

type RehydrateResponse = {
  ok?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number | null;
  error?: string;
};

/**
 * When httpOnly session cookies exist but localStorage JWTs were cleared, restore the LS pair
 * from the refresh cookie (server-side) so Apollo can send Authorization again.
 * @returns true only when tokens are verified in storage after persist.
 */
export async function rehydrateAuthTokensFromCookies(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (readStoredAuthTokens()) return true;

  try {
    const res = await fetch('/api/auth/session/rehydrate', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const json = (await res.json()) as RehydrateResponse;
    const access = json.accessToken?.trim();
    const refresh = json.refreshToken?.trim();
    if (!json.ok || !access || !refresh) return false;

    const cached = readStoredUser();
    const claims = userClaimsFromAccessToken(access);
    const user: EstablishSessionUserInput | undefined = cached?.id
      ? cached
      : claims
        ? { id: claims.id, email: claims.email }
        : undefined;
    const ok = await tryEstablishSession(access, refresh, json.expiresIn ?? undefined, user, {
      notify: false,
    });
    return ok && Boolean(readStoredAuthTokens());
  } catch {
    return false;
  }
}
