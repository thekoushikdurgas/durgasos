import { clearStoredAuthTokens, writeStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getSessionUrl } from '@/lib/backend-url';

async function postSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<Response> {
  const url = getSessionUrl();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      accessToken,
      refreshToken,
      expiresIn: expiresIn ?? undefined,
    }),
  });
}

export async function tryEstablishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<boolean> {
  const res = await postSession(accessToken, refreshToken, expiresIn);
  if (!res.ok) return false;
  writeStoredAuthTokens(accessToken, refreshToken);
  return true;
}

export async function establishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<void> {
  const res = await postSession(accessToken, refreshToken, expiresIn);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to save session');
  }
  writeStoredAuthTokens(accessToken, refreshToken);
}

export async function clearSession(): Promise<void> {
  const url = getSessionUrl();
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to clear session');
    }
  } finally {
    clearStoredAuthTokens();
  }
}
