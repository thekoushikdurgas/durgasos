/** Best-effort client-side storage / non-fatal error swallowing (dev-only logging). */

function devDebug(context: string, err: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[${context}]`, err);
  }
}

export function isStorageQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

/** Swallow expected storage failures (private mode, quota, SSR). */
export function swallowStorageError(context: string, err: unknown): void {
  devDebug(context, err);
}

/** Swallow non-fatal client errors (WS parse, clipboard, iframe postMessage). */
export function swallowClientError(context: string, err: unknown): void {
  devDebug(context, err);
}

export function tryLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    swallowStorageError(`localStorage.get:${key}`, err);
    return null;
  }
}

export function tryLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    swallowStorageError(`localStorage.set:${key}`, err);
    return false;
  }
}

export function tryLocalStorageRemove(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    swallowStorageError(`localStorage.remove:${key}`, err);
    return false;
  }
}

export function tryLocalStorageGetJson<T>(key: string, fallback: T): T {
  const raw = tryLocalStorageGet(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    swallowStorageError(`localStorage.getJson:${key}`, err);
    return fallback;
  }
}

export function tryLocalStorageSetJson(key: string, value: unknown): boolean {
  try {
    return tryLocalStorageSet(key, JSON.stringify(value));
  } catch (err) {
    swallowStorageError(`localStorage.setJson:${key}`, err);
    return false;
  }
}
