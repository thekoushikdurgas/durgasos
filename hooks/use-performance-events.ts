'use client';

import {
  getPerformanceEvents,
  getPerformanceLogStats,
  type PerformanceEventRow,
  type PerformanceLogStats,
} from '@/lib/vsql-api';
import { useCallback, useEffect, useState } from 'react';

const POLL_MS = 4000;
const FETCH_LIMIT = 350;

export function usePerformanceObservability(dbId: string) {
  const [events, setEvents] = useState<PerformanceEventRow[]>([]);
  const [stats, setStats] = useState<PerformanceLogStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!dbId) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    setLoading(true);
    try {
      setError(null);
      const [ev, st] = await Promise.all([
        getPerformanceEvents(dbId, { operation: null, limit: FETCH_LIMIT }),
        getPerformanceLogStats(),
      ]);
      setEvents(ev);
      setStats(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEvents([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [dbId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { events, stats, error, loading, refresh };
}
