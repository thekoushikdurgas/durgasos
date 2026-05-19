'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { useOS } from '@/components/os-context';
import { useWindowLaunch } from '@/components/window-launch-context';
import { RAG_LIST } from '@/lib/graphql-modules';

export function RagApp() {
  const q = useQuery(RAG_LIST, { variables: { limit: 30, offset: 0 } });
  const { openApp } = useOS();
  const launch = useWindowLaunch();
  const storageHint = useMemo(() => {
    const s = launch?.storage;
    const fn = launch?.fileName ?? '';
    if (s?.file_path && fn) {
      return `Opened from Files: ${fn} (${s.file_path}) — ingest via Storage or RAG upload in the API.`;
    }
    return null;
  }, [launch?.fileName, launch?.storage]);

  return (
    <ModuleAppShell title="RAG" subtitle="ragList query">
      {storageHint ? (
        <p className="mb-3 rounded-lg border border-cyan-500/30 bg-cyan-950/25 px-3 py-2 text-xs text-cyan-100/90">
          {storageHint}
        </p>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          onClick={() => q.refetch()}
        >
          Refresh ragList
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-900/40"
          onClick={() => openApp('vectordb')}
        >
          Open Vector DB manager
        </button>
      </div>
      <JsonBlock
        data={(q.data as Record<string, unknown> | undefined)?.ragList}
        error={q.error ?? undefined}
      />
    </ModuleAppShell>
  );
}
