/** Browser-only persistence for rehydrating httpOnly session cookies after a full reload. */

import { swallowStorageError } from '@/lib/safe-client-storage';

export const LS_ACCESS_KEY = 'durgasos_auth_access';
export const LS_REFRESH_KEY = 'durgasos_auth_refresh';
export const LS_USER_KEY = 'durgasos_auth_user';

const SS_ACCESS_KEY = 'durgasos_ss_auth_access';
const SS_REFRESH_KEY = 'durgasos_ss_auth_refresh';
const SS_USER_KEY = 'durgasos_ss_auth_user';

export type StoredUser = {
  id: string;
  email: string | null;
  username?: string | null;
  avatar_url?: string | null;
  /** Access token expiry (ms since epoch). */
  expiresAt: number;
};

function defaultExpiresAt(expiresInSeconds?: number | null): number {
  const sec =
    expiresInSeconds != null && Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3600;
  return Date.now() + Math.max(60, sec) * 1000;
}

export function readStoredAuthTokens(): { access: string; refresh: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const access = window.localStorage.getItem(LS_ACCESS_KEY)?.trim();
    const refresh = window.localStorage.getItem(LS_REFRESH_KEY)?.trim();
    if (access && refresh) return { access, refresh };
  } catch {
    /* localStorage blocked */
  }
  try {
    const access = window.sessionStorage.getItem(SS_ACCESS_KEY)?.trim();
    const refresh = window.sessionStorage.getItem(SS_REFRESH_KEY)?.trim();
    if (access && refresh) return { access, refresh };
  } catch {
    /* sessionStorage blocked */
  }
  return null;
}

/**
 * Persist JWT pair. Optionally updates `expiresAt` on stored user when `expiresIn` is set (seconds).
 * @returns true when both tokens are readable back from storage.
 */
export function writeStoredAuthTokens(
  access: string,
  refresh: string,
  expiresIn?: number | null
): boolean {
  if (typeof window === 'undefined') return false;
  const a = access.trim();
  const r = refresh.trim();
  if (!a || !r) return false;

  let ok = false;
  try {
    window.localStorage.setItem(LS_ACCESS_KEY, a);
    window.localStorage.setItem(LS_REFRESH_KEY, r);
    window.sessionStorage.removeItem(SS_ACCESS_KEY);
    window.sessionStorage.removeItem(SS_REFRESH_KEY);
    ok = true;
  } catch {
    ok = false;
  }

  if (!ok) {
    try {
      window.sessionStorage.setItem(SS_ACCESS_KEY, a);
      window.sessionStorage.setItem(SS_REFRESH_KEY, r);
      ok = true;
    } catch {
      ok = false;
    }
  }

  if (!ok) return false;

  if (expiresIn != null && Number.isFinite(expiresIn)) {
    const existing = readStoredUser();
    if (existing) {
      writeStoredUser({
        ...existing,
        expiresAt: defaultExpiresAt(expiresIn),
      });
    }
  }

  return Boolean(readStoredAuthTokens());
}

export function clearStoredAuthTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LS_ACCESS_KEY);
    window.localStorage.removeItem(LS_REFRESH_KEY);
    window.localStorage.removeItem(LS_USER_KEY);
    window.sessionStorage.removeItem(SS_ACCESS_KEY);
    window.sessionStorage.removeItem(SS_REFRESH_KEY);
    window.sessionStorage.removeItem(SS_USER_KEY);
  } catch (err) {
    swallowStorageError('auth-tokens.clear', err);
  }
}

function parseStoredUser(raw: string | null | undefined): StoredUser | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const p = JSON.parse(trimmed) as unknown;
    if (!p || typeof p !== 'object') return null;
    const o = p as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : '';
    if (!id) return null;
    const expiresAt = typeof o.expiresAt === 'number' ? o.expiresAt : NaN;
    if (!Number.isFinite(expiresAt)) return null;
    return {
      id,
      email: o.email === null ? null : typeof o.email === 'string' ? o.email : null,
      username: typeof o.username === 'string' ? o.username : undefined,
      avatar_url: typeof o.avatar_url === 'string' ? o.avatar_url : undefined,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromLs = parseStoredUser(window.localStorage.getItem(LS_USER_KEY));
    if (fromLs) return fromLs;
  } catch (err) {
    swallowStorageError('auth-tokens.readUser.localStorage', err);
  }
  try {
    return parseStoredUser(window.sessionStorage.getItem(SS_USER_KEY));
  } catch {
    return null;
  }
}

/** True if we have a stored user whose access window has not passed (5s skew). */
export function isStoredUserSessionValid(): boolean {
  const u = readStoredUser();
  if (!u) return false;
  return u.expiresAt > Date.now() + 5000;
}

export function writeStoredUser(user: StoredUser): void {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(user);
  try {
    window.localStorage.setItem(LS_USER_KEY, json);
    window.sessionStorage.removeItem(SS_USER_KEY);
  } catch {
    try {
      window.sessionStorage.setItem(SS_USER_KEY, json);
    } catch {
      /* quota */
    }
  }
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LS_USER_KEY);
    window.sessionStorage.removeItem(SS_USER_KEY);
  } catch (err) {
    swallowStorageError('auth-tokens.clear', err);
  }
}

/** Merge profile fields into stored user; keeps existing expiresAt unless `expiresIn` passed (seconds). */
export function mergeStoredUser(
  partial: Pick<StoredUser, 'id' | 'email'> &
    Partial<Pick<StoredUser, 'username' | 'avatar_url' | 'expiresAt'>>,
  expiresIn?: number | null
): void {
  const prev = readStoredUser();
  const expiresAt =
    partial.expiresAt ??
    (expiresIn != null ? defaultExpiresAt(expiresIn) : (prev?.expiresAt ?? defaultExpiresAt(3600)));
  writeStoredUser({
    id: partial.id,
    email: partial.email,
    username: partial.username ?? prev?.username,
    avatar_url: partial.avatar_url ?? prev?.avatar_url,
    expiresAt,
  });
}
