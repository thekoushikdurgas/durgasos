import { getSessionUrl } from '@/lib/backend-url';

export async function establishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<void> {
  const res = await fetch(getSessionUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      accessToken,
      refreshToken,
      expiresIn: expiresIn ?? undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to save session');
  }
}

export async function clearSession(): Promise<void> {
  const res = await fetch(getSessionUrl(), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to clear session');
  }
}
