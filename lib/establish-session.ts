export async function establishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number | null
): Promise<void> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
