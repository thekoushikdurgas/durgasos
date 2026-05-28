'use client';

import { useQuery } from '@apollo/client/react';
import { STORAGE_BUCKETS } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';

export function StorageApp() {
  const q = useQuery(STORAGE_BUCKETS, { variables: { params: null } });

  return (
    <ModuleAppShell>
      <button
        type="button"
        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
        onClick={() => q.refetch()}
      >
        Refresh storageBuckets
      </button>
      <JsonBlock
        data={(q.data as Record<string, unknown> | undefined)?.storageBuckets}
        error={q.error ?? undefined}
      />
    </ModuleAppShell>
  );
}
