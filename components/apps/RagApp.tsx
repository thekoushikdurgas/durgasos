'use client';

import { useQuery } from '@apollo/client/react';
import { RAG_LIST } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';

export function RagApp() {
  const q = useQuery(RAG_LIST, { variables: { limit: 30, offset: 0 } });

  return (
    <ModuleAppShell title="RAG" subtitle="ragList query">
      <button
        type="button"
        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
        onClick={() => q.refetch()}
      >
        Refresh ragList
      </button>
      <JsonBlock
        data={(q.data as Record<string, unknown> | undefined)?.ragList}
        error={q.error ?? undefined}
      />
    </ModuleAppShell>
  );
}
