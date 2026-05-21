'use client';

import { useMutation } from '@apollo/client/react';
import { useEffect, useState } from 'react';

import { ModuleAppShell } from '@/components/apps/ModuleAppShell';
import { useWindowLaunch } from '@/components/window-launch-context';
import { extensionFromFileName } from '@/lib/app-file-associations';
import { formatPathDisplay, listDirectory, type PathSegments } from '@/lib/file-explorer-mock';
import { STORAGE_GET_URL } from '@/lib/graphql-modules';
import { getStorageSignedUrl } from '@/lib/storage-signed-url';
import { useGoogleDriveLaunchSource } from '@/hooks/use-google-drive-launch-source';

const MAX_BYTES = 2 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function tryDecodeUtf8(buf: ArrayBuffer): string | null {
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) {
    if (u8[i] === 0) return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(u8);
  } catch {
    return null;
  }
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'text'; title: string; body: string }
  | {
      kind: 'blob';
      title: string;
      ext: string;
      downloadUrl: string;
      sizeBytes?: number;
    }
  | { kind: 'mock'; title: string; detail: string }
  | { kind: 'error'; message: string };

export function ViewerApp() {
  const launch = useWindowLaunch();
  const driveSrc = useGoogleDriveLaunchSource(launch);
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const [state, setState] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setState({ kind: 'loading' });

      const s = launch?.storage;
      const fileName = launch?.fileName ?? 'file';
      const ext = extensionFromFileName(fileName);
      const seg = launch?.pathSegments;

      if (driveSrc.objectUrl) {
        try {
          const res = await fetch(driveSrc.objectUrl);
          if (cancelled) return;
          if (!res.ok) {
            setState({ kind: 'error', message: `Download failed (${res.status}).` });
            return;
          }
          const buf = await res.arrayBuffer();
          if (cancelled) return;
          if (buf.byteLength > MAX_BYTES) {
            setState({
              kind: 'blob',
              title: fileName,
              ext,
              downloadUrl: driveSrc.objectUrl,
              sizeBytes: buf.byteLength,
            });
            return;
          }
          const text = tryDecodeUtf8(buf);
          if (text != null) {
            setState({ kind: 'text', title: fileName, body: text });
          } else {
            setState({
              kind: 'blob',
              title: fileName,
              ext,
              downloadUrl: driveSrc.objectUrl,
              sizeBytes: buf.byteLength,
            });
          }
        } catch {
          if (!cancelled) {
            setState({
              kind: 'error',
              message: driveSrc.error ?? 'Could not load Google Drive file.',
            });
          }
        }
        return;
      }

      if (s?.file_path && s.bucket_type) {
        try {
          const signed = await getStorageSignedUrl(getUrl, {
            bucket_type: s.bucket_type,
            file_path: s.file_path,
          });
          if (cancelled) return;
          if (!signed) {
            setState({ kind: 'error', message: 'Could not resolve download URL.' });
            return;
          }

          let sizeFromHead: number | undefined;
          try {
            const head = await fetch(signed, { method: 'HEAD' });
            if (head.ok) {
              const cl = head.headers.get('content-length');
              if (cl) {
                const n = Number(cl);
                if (Number.isFinite(n)) sizeFromHead = n;
              }
            }
          } catch {
            /* HEAD may fail (CORS); fall through to GET */
          }

          if (cancelled) return;
          if (sizeFromHead != null && sizeFromHead > MAX_BYTES) {
            setState({
              kind: 'blob',
              title: fileName,
              ext,
              downloadUrl: signed,
              sizeBytes: sizeFromHead,
            });
            return;
          }

          const res = await fetch(signed);
          if (cancelled) return;
          if (!res.ok) {
            setState({ kind: 'error', message: `Download failed (${res.status}).` });
            return;
          }
          const buf = await res.arrayBuffer();
          if (cancelled) return;

          if (buf.byteLength > MAX_BYTES) {
            setState({
              kind: 'blob',
              title: fileName,
              ext,
              downloadUrl: signed,
              sizeBytes: buf.byteLength,
            });
            return;
          }

          const text = tryDecodeUtf8(buf);
          if (text != null) {
            setState({ kind: 'text', title: fileName, body: text });
          } else {
            setState({
              kind: 'blob',
              title: fileName,
              ext,
              downloadUrl: signed,
              sizeBytes: buf.byteLength,
            });
          }
        } catch {
          if (!cancelled) {
            setState({ kind: 'error', message: 'Something went wrong loading the file.' });
          }
        }
        return;
      }

      if (Array.isArray(seg) && seg.length > 0 && launch?.fileName) {
        const path = [...seg] as unknown as PathSegments;
        const dir = listDirectory(path);
        const hit = dir.find((e) => e.name === launch.fileName && e.kind === 'file');
        if (cancelled) return;
        if (hit) {
          setState({
            kind: 'mock',
            title: launch.fileName,
            detail: `${formatPathDisplay(path)} > ${hit.name} — ${hit.typeLabel ?? 'File'}${hit.sizeBytes != null ? ` · ${formatBytes(hit.sizeBytes)}` : ''}. The demo tree has no real file bytes; open from My Storage for live content.`,
          });
        } else {
          setState({ kind: 'error', message: 'File not found in demo workspace.' });
        }
        return;
      }

      if (!cancelled) {
        setState({
          kind: 'error',
          message: 'Open a file from Files (or My Storage when signed in).',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    getUrl,
    launch?.fileName,
    launch?.pathSegments,
    launch?.storage,
    launch?.googleDrive,
    driveSrc.objectUrl,
    driveSrc.error,
  ]);

  return (
    <ModuleAppShell title="Viewer" subtitle="Catch-all file preview">
      {state.kind === 'loading' ? <p className="text-sm text-white/50">Loading…</p> : null}

      {state.kind === 'text' ? (
        <div className="flex min-h-0 flex-col gap-2">
          <p className="text-xs text-white/50">{state.title}</p>
          <pre className="max-h-[min(32rem,70vh)] overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white/90">
            {state.body}
          </pre>
        </div>
      ) : null}

      {state.kind === 'blob' ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-medium text-white/90">{state.title}</p>
          {state.ext ? (
            <p className="text-xs text-white/50">
              Extension: <span className="font-mono">.{state.ext}</span>
            </p>
          ) : null}
          {state.sizeBytes != null ? (
            <p className="text-xs text-white/50">Size: {formatBytes(state.sizeBytes)}</p>
          ) : null}
          <p className="text-xs text-white/45">
            File is binary, too large to preview safely in the desktop shell, or not UTF‑8 text.
          </p>
          <a
            href={state.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg bg-blue-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
          >
            Open / download in browser
          </a>
        </div>
      ) : null}

      {state.kind === 'mock' ? (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 text-sm text-cyan-50/90">
          <p className="font-medium">{state.title}</p>
          <p className="mt-2 text-xs text-white/60">{state.detail}</p>
        </div>
      ) : null}

      {state.kind === 'error' ? <p className="text-sm text-amber-200/90">{state.message}</p> : null}
    </ModuleAppShell>
  );
}
