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
import { useWindowLaunch } from '@/components/window-launch-context';

export function DocsApp() {
  const launch = useWindowLaunch();
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);

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
    if (launch?.fileName?.match(/\.(txt|md)$/i) && ref.current) {
      ref.current.textContent = `Opened from Files: ${launch.fileName}\n\n`;
      queueMicrotask(syncStats);
    }
  }, [launch?.fileName, syncStats]);

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
            onInput={syncStats}
          >
            <h1 className="mb-4 text-2xl font-bold text-blue-800">Durgas Docs</h1>
            <p>Type here — contenteditable demo.</p>
          </div>
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
