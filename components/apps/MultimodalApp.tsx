'use client';

import { useMutation } from '@apollo/client/react';
import { useEffect, useRef, useState } from 'react';
import { TEXT_TO_IMAGE, STORAGE_GET_URL } from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { RemoteImage } from '@/components/ui/remote-image';
import { useWindowLaunch } from '@/components/window-launch-context';
import { getStorageSignedUrl } from '@/lib/storage-signed-url';
import { extensionFromFileName } from '@/lib/app-file-associations';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'svg']);

export function MultimodalApp() {
  const launch = useWindowLaunch();
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const [paramsJson, setParamsJson] = useState(
    '{"prompt":"A neon cyberpunk skyline","model":"default"}'
  );
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [out, setOut] = useState<unknown>(null);
  const [err, setErr] = useState<Error | null>(null);
  const [run, { loading }] = useMutation(TEXT_TO_IMAGE);
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
        setRefImageUrl(url);
        setParamsJson(
          JSON.stringify(
            {
              prompt: `Reference image from Files (${name}). Describe and extend creatively.`,
              model: 'default',
              image_url: url,
            },
            null,
            2
          )
        );
      } catch {
        appliedRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launch?.fileName, launch?.storage, getUrl]);

  return (
    <ModuleAppShell>
      {refImageUrl ? (
        <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-2">
          <p className="mb-1 text-[10px] text-white/50">Reference from storage</p>
          <RemoteImage
            src={refImageUrl}
            alt=""
            className="max-h-32 max-w-full rounded object-contain"
            width={512}
            height={128}
          />
        </div>
      ) : null}
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
