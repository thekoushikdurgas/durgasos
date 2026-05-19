'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  FileText,
} from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import { useWindowLaunch } from '@/components/window-launch-context';
import { fetchStorageText } from '@/lib/storage-signed-url';
import { STORAGE_GET_URL } from '@/lib/graphql-modules';

const DEFAULT_DOC_HTML =
  '<h1 class="mb-4 text-2xl font-bold text-blue-800">Durgas Docs</h1><p>Type here — contenteditable demo.</p>';

/** Extensions we load as UTF-8 text from object storage in this app. */
const STORAGE_TEXT_FILE = /\.(txt|md|markdown|log|rst|csv|tsv|json|xml)$/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initialDocHtml(launch: ReturnType<typeof useWindowLaunch>): string {
  const s = launch?.storage;
  if (s?.file_path) return '<p class="text-slate-600">Loading…</p>';
  const fn = launch?.fileName ?? '';
  if (fn.match(STORAGE_TEXT_FILE)) return '<p class="text-slate-600">Loading…</p>';
  return DEFAULT_DOC_HTML;
}

export function DocsApp() {
  const launch = useWindowLaunch();
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [getUrl] = useMutation(STORAGE_GET_URL);
  const [docHtml, setDocHtml] = useState(() => initialDocHtml(launch));

  const countWords = useCallback((html: string) => {
    const text = html.replace(/<[^>]+>/g, ' ').trim();
    if (!text) return { w: 0, c: 0 };
    const w = text.split(/\s+/).filter(Boolean).length;
    return { w, c: text.length };
  }, []);

  const [stats, setStats] = useState({ w: 0, c: 0 });

  const syncStats = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setStats(countWords(el.innerHTML));
  }, [countWords]);

  useEffect(() => {
    const s = launch?.storage;
    if (s?.file_path) {
      let cancelled = false;
      void (async () => {
        try {
          const text = await fetchStorageText(getUrl, {
            bucket_type: s.bucket_type,
            file_path: s.file_path,
          });
          if (cancelled) return;
          if (text == null) {
            setDocHtml(
              '<p class="text-red-600">Could not load this file from storage (missing URL or network error).</p>'
            );
            queueMicrotask(syncStats);
            return;
          }
          setDocHtml(
            `<pre class="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-slate-900">${escapeHtml(text)}</pre>`
          );
          queueMicrotask(syncStats);
        } catch {
          if (!cancelled) {
            setDocHtml('<p class="text-red-600">Failed to load file.</p>');
            queueMicrotask(syncStats);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const fn = launch?.fileName ?? '';
    const hasPath = Boolean(launch?.pathSegments?.length);
    if (hasPath && fn.match(STORAGE_TEXT_FILE)) {
      queueMicrotask(() => {
        setDocHtml(
          `<p class="text-slate-700">Opened from Files: <strong>${escapeHtml(fn)}</strong></p><p class="mt-3 text-slate-500">Local folders in this demo do not provide file contents — use <strong>My Storage</strong> for real files.</p>`
        );
        queueMicrotask(syncStats);
      });
      return undefined;
    }

    if (fn.match(STORAGE_TEXT_FILE)) {
      queueMicrotask(() => {
        setDocHtml(
          `<p class="text-slate-700">Opened from Files: <strong>${escapeHtml(fn)}</strong></p>`
        );
        queueMicrotask(syncStats);
      });
    }
    return undefined;
  }, [
    launch?.fileName,
    launch?.pathSegments,
    launch?.storage,
    launch?.storage?.bucket_type,
    launch?.storage?.file_path,
    getUrl,
    syncStats,
  ]);

  useEffect(() => {
    queueMicrotask(syncStats);
  }, [syncStats]);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-900/95 text-slate-100">
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/10 px-2 text-[10px] uppercase text-white/50">
        {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Help'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-white/5 px-2">
        <button type="button" className="rounded p-1.5 hover:bg-white/10" title="Save">
          <Save className="h-4 w-4" />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/10" title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/10" title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/10" title="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-2 h-4 w-px bg-white/15" />
        <button type="button" className="rounded p-1.5 hover:bg-white/10">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/10">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/10">
          <AlignRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex h-6 shrink-0 items-center border-b border-white/5 px-4 text-[9px] text-white/30">
        <span className="tabular-nums">0</span>
        <span className="mx-1">1</span>
        <span className="mx-1">2</span>
        <span className="mx-1">3</span>
        <span className="mx-1">4</span>
        <span className="mx-1">5</span>
        <span className="mx-1">6</span>
        <span className="mx-1">7</span>
        <span className="ml-4">… ruler (demo)</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto bg-slate-800/50 p-6">
          <div
            className="mx-auto min-h-[480px] max-w-[640px] bg-white p-8 text-sm text-slate-900 shadow-lg outline-none"
            style={{ zoom: `${zoom}%` }}
            contentEditable
            suppressContentEditableWarning
            ref={ref}
            onInput={() => {
              const el = ref.current;
              if (!el) return;
              setDocHtml(el.innerHTML);
              syncStats();
            }}
            dangerouslySetInnerHTML={{ __html: docHtml }}
          />
        </div>
        <aside className="flex w-10 shrink-0 flex-col items-center gap-2 border-l border-white/10 py-2">
          <button
            type="button"
            className="rounded p-1 text-white/50 hover:bg-white/10"
            title="Properties"
          >
            <FileText className="h-4 w-4" />
          </button>
        </aside>
      </div>
      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-white/10 bg-black/30 px-3 text-[10px] text-white/50">
        <span>
          Page 1 of 1 · {stats.w} words · {stats.c} chars
        </span>
        <label className="flex items-center gap-2">
          Zoom
          <input
            type="range"
            min={50}
            max={150}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 accent-blue-500"
          />
          <span>{zoom}%</span>
        </label>
      </footer>
    </div>
  );
}
