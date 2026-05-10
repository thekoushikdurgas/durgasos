'use client';

import { useMutation } from '@apollo/client/react';
import { ANALYZE_IMAGE } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { useState } from 'react';

export function VisionApp() {
  const [paramsJson, setParamsJson] = useState('{"image_url":"https://example.com/image.jpg"}');
  const [out, setOut] = useState<unknown>(null);
  const [err, setErr] = useState<Error | null>(null);
  const [run, { loading }] = useMutation(ANALYZE_IMAGE);

  return (
    <ModuleAppShell title="Vision" subtitle="analyzeImage mutation (JSON params per backend)">
      <textarea
        value={paramsJson}
        onChange={(e) => setParamsJson(e.target.value)}
        className="min-h-[100px] w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px]"
      />
      <button
        type="button"
        disabled={loading}
        className="mt-2 rounded-lg bg-violet-600/80 px-4 py-2 text-xs disabled:opacity-50"
        onClick={async () => {
          setErr(null);
          try {
            let p: unknown = {};
            try {
              p = JSON.parse(paramsJson) as object;
            } catch {
              throw new Error('Invalid JSON');
            }
            const res = await run({ variables: { params: p } });
            setOut((res.data as Record<string, unknown> | undefined)?.analyzeImage);
          } catch (e) {
            setErr(e instanceof Error ? e : new Error(String(e)));
          }
        }}
      >
        {loading ? 'Running…' : 'analyzeImage'}
      </button>
      <JsonBlock data={out} error={err} />
    </ModuleAppShell>
  );
}
