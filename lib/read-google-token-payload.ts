/** Normalize `getLinkedGoogleAccountToken` JSON from GraphQL. */
export function readGoogleTokenPayload(raw: unknown): {
  accessToken: string | null;
  expiresAt: number | null;
} {
  if (!raw || typeof raw !== 'object') return { accessToken: null, expiresAt: null };
  const o = raw as Record<string, unknown>;
  const accessToken =
    typeof o.accessToken === 'string'
      ? o.accessToken
      : typeof o.access_token === 'string'
        ? o.access_token
        : null;
  const te = o.tokenExpiresAt ?? o.token_expires_at;
  let expiresAt: number | null = null;
  if (typeof te === 'number' && Number.isFinite(te)) expiresAt = te;
  else if (typeof te === 'string' && te.trim()) {
    const n = Number(te);
    if (Number.isFinite(n)) expiresAt = n;
  }
  return { accessToken, expiresAt };
}

/** True when expiresAt is in the past (supports seconds or ms since epoch). */
export function isGoogleAccessTokenExpired(
  expiresAt: number | null,
  nowMs: number = Date.now()
): boolean {
  if (expiresAt == null || !Number.isFinite(expiresAt)) return false;
  const expMs = expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
  return nowMs >= expMs - 60_000;
}
