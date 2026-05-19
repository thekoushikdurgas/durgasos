export type LinkedGoogleAccountRow = {
  id: string;
  googleUserId: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  tokenExpiresAt?: number | null;
  scopesGranted?: string | null;
  createdAt?: string | null;
};

export function parseLinkedGoogleAccounts(raw: unknown): LinkedGoogleAccountRow[] {
  if (!Array.isArray(raw)) return [];
  const out: LinkedGoogleAccountRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : null;
    const googleUserId =
      typeof o.googleUserId === 'string'
        ? o.googleUserId
        : typeof o.google_user_id === 'string'
          ? o.google_user_id
          : null;
    if (!id || !googleUserId) continue;
    const email =
      typeof o.email === 'string' ? o.email : typeof o.email === 'number' ? String(o.email) : '';
    const displayName =
      typeof o.displayName === 'string'
        ? o.displayName
        : typeof o.display_name === 'string'
          ? o.display_name
          : null;
    const photoUrl =
      typeof o.photoUrl === 'string'
        ? o.photoUrl
        : typeof o.photo_url === 'string'
          ? o.photo_url
          : null;
    let tokenExpiresAt: number | null | undefined;
    const te = o.tokenExpiresAt ?? o.token_expires_at;
    if (typeof te === 'number' && Number.isFinite(te)) tokenExpiresAt = te;
    else if (typeof te === 'string' && te.trim()) {
      const n = Number(te);
      if (Number.isFinite(n)) tokenExpiresAt = n;
    }
    const createdAt =
      typeof o.createdAt === 'string'
        ? o.createdAt
        : typeof o.created_at === 'string'
          ? o.created_at
          : null;
    const scopesGranted =
      typeof o.scopesGranted === 'string'
        ? o.scopesGranted
        : typeof o.scopes_granted === 'string'
          ? o.scopes_granted
          : null;
    out.push({
      id,
      googleUserId,
      email,
      displayName,
      photoUrl,
      tokenExpiresAt: tokenExpiresAt ?? null,
      scopesGranted,
      createdAt,
    });
  }
  return out;
}

export function defaultGoogleOAuthExpiryEpoch(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

export function isGoogleAccessLikelyExpired(tokenExpiresAt: number | null | undefined): boolean {
  if (tokenExpiresAt == null || !Number.isFinite(tokenExpiresAt)) return false;
  const now = Date.now() / 1000;
  return tokenExpiresAt <= now + 120;
}
