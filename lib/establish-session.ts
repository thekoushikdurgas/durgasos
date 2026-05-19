import { clearStoredAuthTokens, writeStoredAuthTokens } from '@/lib/auth-tokens-local';
import { notifyAuthSessionChanged } from '@/lib/auth-session-events';
import { fetchBackendGraphql } from '@/lib/backend-http';

const ESTABLISH_SESSION = `mutation EstablishSession($accessToken: String!, $refreshToken: String!, $expiresIn: Int) {
  establishSession(accessToken: $accessToken, refreshToken: $refreshToken, expiresIn: $expiresIn) {
    ok
    error
  }
}`;

const CLEAR_SESSION = `mutation ClearSession {
  clearSession {
    ok
    error
  }
}`;

async function postSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<Response> {
  return fetchBackendGraphql({
    query: ESTABLISH_SESSION,
    variables: {
      accessToken,
      refreshToken,
      expiresIn: expiresIn ?? null,
    },
  });
}

function sessionMutationOk(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const data = (json as { data?: { establishSession?: { ok?: boolean } } }).data;
  return Boolean(data?.establishSession?.ok);
}

export async function tryEstablishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<boolean> {
  const res = await postSession(accessToken, refreshToken, expiresIn);
  const json = (await res.json()) as unknown;
  if (!res.ok || !sessionMutationOk(json)) return false;
  writeStoredAuthTokens(accessToken, refreshToken);
  return true;
}

export async function establishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
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
  writeStoredAuthTokens(accessToken, refreshToken);
}

export async function clearSession(): Promise<void> {
  try {
    const res = await fetchBackendGraphql({ query: CLEAR_SESSION });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
    const ok = Boolean(
      (json as { data?: { clearSession?: { ok?: boolean } } } | null)?.data?.clearSession?.ok
    );
    if (!res.ok || !ok) {
      throw new Error(text || 'Failed to clear session');
    }
  } finally {
    clearStoredAuthTokens();
    notifyAuthSessionChanged();
  }
}
