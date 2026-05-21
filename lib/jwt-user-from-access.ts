/** Best-effort JWT payload decode (client display/sync only — not verified). */

export type JwtUserClaims = {
  id: string;
  email: string | null;
};

export function userClaimsFromAccessToken(accessToken: string): JwtUserClaims | null {
  const tok = accessToken.trim();
  const part = tok.split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(padded)) as Record<string, unknown>;
    const rawId = json.sub ?? json.user_id ?? json.id;
    const id = rawId != null ? String(rawId).trim() : '';
    if (!id) return null;
    const email =
      typeof json.email === 'string'
        ? json.email
        : typeof json.user_email === 'string'
          ? json.user_email
          : null;
    return { id, email };
  } catch {
    return null;
  }
}
