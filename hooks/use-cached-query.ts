'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CACHE_TTL_MS, localCache } from '@/lib/local-cache';

export type UseCachedQueryOptions = {
  /** After this many ms since write, keep showing cache but refetch in background (only while entry not hard-expired). */
  backgroundRefreshMs?: number;
};

export type UseCachedQueryResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => void;
};

function initialDataAndLoading<T>(
  cacheKey: string,
  ttlMs: number,
  options?: UseCachedQueryOptions
): { data: T | null; loading: boolean } {
  if (typeof window === 'undefined') {
    return { data: null, loading: true };
  }
  const entry = localCache.peekEntry<T>(cacheKey);
  if (!entry) {
    return { data: null, loading: true };
  }
  const now = Date.now();
  const isFresh = now <= entry.exp;
  const bg = options?.backgroundRefreshMs ?? 0;
  const softStale = bg > 0 && now > entry.wroteAt + bg;

  if (isFresh && !softStale) {
    return { data: entry.data, loading: false };
  }
  if (isFresh && softStale) {
    return { data: entry.data, loading: false };
  }
  if (!isFresh && bg > 0) {
    return { data: entry.data, loading: true };
  }
  return { data: null, loading: true };
}

/**
 * Stale-while-revalidate: instant read from L1 cache, optional background refresh when soft-stale or hard-expired (with `backgroundRefreshMs`).
 */
export function useCachedQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs: number = CACHE_TTL_MS.metrics_summary,
  options?: UseCachedQueryOptions
): UseCachedQueryResult<T> {
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  const [{ data, loading }, setState] = useState(() =>
    initialDataAndLoading<T>(cacheKey, ttlMs, options)
  );
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    setState(initialDataAndLoading<T>(cacheKey, ttlMs, optsRef.current));
    setError(null);
  }, [cacheKey, ttlMs]);

  const run = useCallback(
    async (force: boolean) => {
      if (typeof window === 'undefined') return;
      const opts = optsRef.current;
      const bg = opts?.backgroundRefreshMs ?? 0;
      const entry = localCache.peekEntry<T>(cacheKey);
      const now = Date.now();
      const isFresh = entry && now <= entry.exp;
      const softStale = Boolean(entry && isFresh && bg > 0 && now > entry.wroteAt + bg);

      if (!force && entry && isFresh && !softStale) {
        setState({ data: entry.data, loading: false });
        return;
      }

      if (!force && entry && isFresh && softStale) {
        setState({ data: entry.data, loading: false });
        setError(null);
        try {
          const next = await fetcherRef.current();
          if (ttlMs > 0) {
            localCache.set(cacheKey, next, ttlMs);
          }
          setState({ data: next, loading: false });
        } catch (e) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
        return;
      }

      if (!force && entry && !isFresh && bg > 0) {
        setState({ data: entry.data, loading: true });
        setError(null);
        try {
          const next = await fetcherRef.current();
          if (ttlMs > 0) {
            localCache.set(cacheKey, next, ttlMs);
          }
          setState({ data: next, loading: false });
        } catch (e) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setState({ data: entry.data, loading: false });
        }
        return;
      }

      if (force) {
        localCache.invalidate(cacheKey);
      } else if (entry && !isFresh && !bg) {
        localCache.invalidate(cacheKey);
      }

      setState((s) => ({ ...s, loading: true }));
      setError(null);
      try {
        const next = await localCache.getOrFetch(
          cacheKey,
          () => fetcherRef.current(),
          force ? 0 : ttlMs
        );
        setState({ data: next, loading: false });
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setState((s) => ({ ...s, loading: false }));
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
