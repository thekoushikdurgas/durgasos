'use client';

import { useQuery } from '@apollo/client/react';

import { SYSTEM_HEALTH } from '@/lib/graphql-modules';

export type SystemHealthOverall = 'online' | 'degraded' | 'offline';

export function useSystemHealth(pollIntervalMs = 30_000) {
  const { data, loading, error, refetch } = useQuery(SYSTEM_HEALTH, {
    variables: { params: {} },
    pollInterval: pollIntervalMs,
    fetchPolicy: 'network-only',
  });

  const raw = (data as { systemHealth?: Record<string, unknown> } | undefined)?.systemHealth;

  let overall: SystemHealthOverall = 'offline';
  if (!error && raw) {
    const st = String(raw.status ?? '').toLowerCase();
    if (st === 'healthy') overall = 'online';
    else if (st === 'degraded') overall = 'degraded';
    else overall = 'offline';
  }

  return { raw, overall, loading, error, refetch };
}
