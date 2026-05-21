import {
  clearStoredAuthTokens,
  mergeStoredUser,
  readStoredAuthTokens,
  type StoredUser,
  writeStoredAuthTokens,
} from '@/lib/auth-tokens-local';
import { userClaimsFromAccessToken } from '@/lib/jwt-user-from-access';
import { notifyClearApolloCache } from '@/lib/apollo-cache-events';
import { notifyAuthSessionChanged } from '@/lib/auth-session-events';
import { dispatchOsNotification } from '@/lib/notifications';

export type EstablishSessionUserInput = Pick<StoredUser, 'id' | 'email'> &
  Partial<Pick<StoredUser, 'username' | 'avatar_url'>>;

async function postSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<Response> {
  return fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken,
      refreshToken,
      expiresIn: expiresIn ?? null,
    }),
  });
}

function sessionMutationOk(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  return Boolean((json as { ok?: boolean }).ok);
}

function persistTokensAndUser(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null,
  user?: EstablishSessionUserInput | null
): boolean {
  const stored = writeStoredAuthTokens(accessToken, refreshToken, expiresIn);
  const claims = user?.id ? null : userClaimsFromAccessToken(accessToken);
  const profile = user?.id ? user : claims ? { id: claims.id, email: claims.email } : null;
  if (profile?.id) {
    mergeStoredUser(
      {
        id: profile.id,
        email: profile.email ?? null,
        username: user?.username,
        avatar_url: user?.avatar_url,
      },
      expiresIn
    );
  }
  return stored;
}

export async function tryEstablishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null,
  user?: EstablishSessionUserInput | null,
  options?: { notify?: boolean }
): Promise<boolean> {
  const res = await postSession(accessToken, refreshToken, expiresIn);
  const json = (await res.json()) as unknown;
  if (!res.ok || !sessionMutationOk(json)) return false;
  const stored = persistTokensAndUser(accessToken, refreshToken, expiresIn, user);
  if (!stored || !readStoredAuthTokens()) return false;
  if (options?.notify !== false) {
    notifyAuthSessionChanged();
  }
  return true;
}

export async function establishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null,
  user?: EstablishSessionUserInput | null
): Promise<void> {
  const res = await postSession(accessToken, refreshToken, expiresIn);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = null;
  }
  if (!res.ok || !sessionMutationOk(json)) {
    throw new Error(text || 'Failed to save session');
  }
  if (!persistTokensAndUser(accessToken, refreshToken, expiresIn, user)) {
    throw new Error('Failed to persist session tokens in this browser');
  }
  dispatchOsNotification({
    title: 'Signed in',
    body: user?.email ?? undefined,
    level: 'success',
  });
}

export async function clearSession(): Promise<void> {
  try {
    const res = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to clear session');
    }
  } finally {
    clearStoredAuthTokens();
    notifyClearApolloCache();
    notifyAuthSessionChanged();
    dispatchOsNotification({ title: 'Signed out', level: 'info' });
  }
}
