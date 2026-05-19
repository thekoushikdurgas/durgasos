import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

export type CachedFetchOptions = {
  ttlMs: number;
  /** Logical cache key (not URL) — include params if needed */
  cacheKey: string;
  init?: RequestInit;
  force?: boolean;
};

/**
 * GET/POST JSON with L1 localStorage TTL cache (browser only).
 */
export async function cachedFetch<T>(path: string, options: CachedFetchOptions): Promise<T> {
  const { ttlMs, cacheKey, init, force } = options;
  if (typeof window === 'undefined') {
    const r = await fetch(path, { ...init, credentials: 'include' });
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return (await r.json()) as T;
  }

  if (force) {
    localCache.invalidate(cacheKey);
  } else if (ttlMs > 0) {
    const hit = localCache.get<T>(cacheKey);
    if (hit !== null) return hit;
  }

  return localCache.getOrFetch(
    cacheKey,
    async () => {
      const r = await fetch(path, {
        ...init,
        credentials: init?.credentials ?? 'include',
      });
      if (!r.ok) throw new Error(`Request failed: ${r.status} ${r.statusText}`);
      return (await r.json()) as T;
    },
    force ? 0 : ttlMs
  );
}

export function invalidateApiCache(cacheKey: string) {
  localCache.invalidate(cacheKey);
}

export function invalidateApiCachePrefix(prefix: string) {
  localCache.invalidatePattern(`${prefix}*`);
}

export { CACHE_TTL_MS };
