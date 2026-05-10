'use client';

import { useQuery } from '@apollo/client/react';
import { METRICS_SUMMARY, SYSTEM_HEALTH } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';

export function MetricsApp() {
  const health = useQuery(SYSTEM_HEALTH, { variables: { params: null } });
  const metrics = useQuery(METRICS_SUMMARY, { variables: { params: null } });

  return (
    <ModuleAppShell title="Metrics" subtitle="systemHealth + metricsSummary">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          onClick={() => health.refetch()}
        >
          systemHealth
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          onClick={() => metrics.refetch()}
        >
          metricsSummary
        </button>
      </div>
      <p className="mt-2 text-[11px] text-white/45">systemHealth</p>
      <JsonBlock
        data={(health.data as Record<string, unknown> | undefined)?.systemHealth}
        error={health.error ?? undefined}
      />
      <p className="mt-4 text-[11px] text-white/45">metricsSummary</p>
      <JsonBlock
        data={(metrics.data as Record<string, unknown> | undefined)?.metricsSummary}
        error={metrics.error ?? undefined}
      />
    </ModuleAppShell>
  );
}
