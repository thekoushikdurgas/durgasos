'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

export type UseCachedQueryResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => void;
};

/**
 * Stale-while-revalidate: instant read from L1 cache, background refresh when stale.
 */
export function useCachedQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs: number = CACHE_TTL_MS.metrics_summary
): UseCachedQueryResult<T> {
  const [data, setData] = useState<T | null>(() =>
    typeof window !== 'undefined' ? localCache.get<T>(cacheKey) : null
  );
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localCache.get<T>(cacheKey) === null;
  });
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const run = useCallback(
    async (force: boolean) => {
      if (typeof window === 'undefined') return;
      const cached = force ? null : localCache.get<T>(cacheKey);
      if (cached !== null && !force) {
        setData(cached);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (force) localCache.invalidate(cacheKey);
        const next = await localCache.getOrFetch(
          cacheKey,
          () => fetcherRef.current(),
          force ? 0 : ttlMs
        );
        setData(next);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, ttlMs]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void run(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [run]);

  const refetch = useCallback(
    (force = true) => {
      void run(force);
    },
    [run]
  );

  return { data, loading, error, refetch };
}
