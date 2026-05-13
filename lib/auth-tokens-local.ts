/** Browser-only persistence for rehydrating httpOnly session cookies after a full reload. */

export const LS_ACCESS_KEY = 'durgasos_auth_access';
export const LS_REFRESH_KEY = 'durgasos_auth_refresh';

export function readStoredAuthTokens(): { access: string; refresh: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const access = window.localStorage.getItem(LS_ACCESS_KEY)?.trim();
    const refresh = window.localStorage.getItem(LS_REFRESH_KEY)?.trim();
    if (!access || !refresh) return null;
    return { access, refresh };
  } catch {
    return null;
  }
}

export function writeStoredAuthTokens(access: string, refresh: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_ACCESS_KEY, access);
    window.localStorage.setItem(LS_REFRESH_KEY, refresh);
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredAuthTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LS_ACCESS_KEY);
    window.localStorage.removeItem(LS_REFRESH_KEY);
  } catch {
    /* ignore */
  }
}
