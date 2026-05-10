'use client';

import { useMutation } from '@apollo/client/react';
import { TEXT_TO_IMAGE } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { useState } from 'react';

export function MultimodalApp() {
  const [paramsJson, setParamsJson] = useState(
    '{"prompt":"A neon cyberpunk skyline","model":"default"}'
  );
  const [out, setOut] = useState<unknown>(null);
  const [err, setErr] = useState<Error | null>(null);
  const [run, { loading }] = useMutation(TEXT_TO_IMAGE);

  return (
    <ModuleAppShell title="Multimodal" subtitle="textToImage mutation">
      <textarea
        value={paramsJson}
        onChange={(e) => setParamsJson(e.target.value)}
        className="min-h-[100px] w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px]"
      />
      <button
        type="button"
        disabled={loading}
        className="mt-2 rounded-lg bg-fuchsia-600/80 px-4 py-2 text-xs disabled:opacity-50"
        onClick={async () => {
          setErr(null);
          try {
            const p = JSON.parse(paramsJson) as object;
            const res = await run({ variables: { params: p } });
            setOut((res.data as Record<string, unknown> | undefined)?.textToImage);
          } catch (e) {
            setErr(e instanceof Error ? e : new Error(String(e)));
          }
        }}
      >
        {loading ? 'Generating…' : 'textToImage'}
      </button>
      <JsonBlock data={out} error={err} />
    </ModuleAppShell>
  );
}
