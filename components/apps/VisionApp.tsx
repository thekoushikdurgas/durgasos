'use client';

import { useMutation } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ANALYZE_IMAGE, STORAGE_GET_URL } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { useWindowLaunch } from '@/components/window-launch-context';
import { getStorageSignedUrl } from '@/lib/storage-signed-url';
import { extensionFromFileName } from '@/lib/app-file-associations';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif']);

export function VisionApp() {
  const launch = useWindowLaunch();
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const [paramsJson, setParamsJson] = useState('{"image_url":"https://example.com/image.jpg"}');
  const [out, setOut] = useState<unknown>(null);
  const [err, setErr] = useState<Error | null>(null);
  const [run, { loading }] = useMutation(ANALYZE_IMAGE);
  const appliedRef = useRef(false);

  useEffect(() => {
    const s = launch?.storage;
    const name = launch?.fileName ?? '';
    if (!s?.file_path || appliedRef.current) return;
    const ext = extensionFromFileName(name);
    if (!IMAGE_EXT.has(ext)) return;
    appliedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const url = await getStorageSignedUrl(getUrl, {
          bucket_type: s.bucket_type,
          file_path: s.file_path,
        });
        if (!url || cancelled) return;
        setParamsJson(JSON.stringify({ image_url: url }, null, 2));
      } catch {
        appliedRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launch?.fileName, launch?.storage, getUrl]);

  const onRun = useCallback(async () => {
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
  }, [paramsJson, run]);

  return (
    <ModuleAppShell>
      <textarea
        value={paramsJson}
        onChange={(e) => setParamsJson(e.target.value)}
        className="min-h-[100px] w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px]"
      />
      <button
        type="button"
        disabled={loading}
        className="mt-2 rounded-lg bg-violet-600/80 px-4 py-2 text-xs disabled:opacity-50"
        onClick={() => void onRun()}
      >
        {loading ? 'Running…' : 'analyzeImage'}
      </button>
      <JsonBlock data={out} error={err} />
    </ModuleAppShell>
  );
}
