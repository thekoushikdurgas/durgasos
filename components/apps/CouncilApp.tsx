'use client';

import { useMutation } from '@apollo/client/react';
import { RUN_COUNCIL } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { useState } from 'react';

export function CouncilApp() {
  const [paramsJson, setParamsJson] = useState(
    '{"query":"Summarize best practices for GraphQL APIs","models":[]}'
  );
  const [out, setOut] = useState<unknown>(null);
  const [err, setErr] = useState<Error | null>(null);
  const [run, { loading }] = useMutation(RUN_COUNCIL);

  return (
    <ModuleAppShell>
      <textarea
        value={paramsJson}
        onChange={(e) => setParamsJson(e.target.value)}
        className="min-h-[120px] w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px]"
      />
      <button
        type="button"
        disabled={loading}
        className="mt-2 rounded-lg bg-amber-600/80 px-4 py-2 text-xs disabled:opacity-50"
        onClick={async () => {
          setErr(null);
          try {
            const p = JSON.parse(paramsJson) as object;
            const res = await run({ variables: { params: p } });
            setOut((res.data as Record<string, unknown> | undefined)?.runCouncil);
          } catch (e) {
            setErr(e instanceof Error ? e : new Error(String(e)));
          }
        }}
      >
        {loading ? 'Running council…' : 'runCouncil'}
      </button>
      <JsonBlock data={out} error={err} />
    </ModuleAppShell>
  );
}
