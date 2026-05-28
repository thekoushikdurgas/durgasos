'use client';

import type { ReactNode } from 'react';

export function ModuleAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}

export function JsonBlock({ data, error }: { data: unknown; error?: Error | null }) {
  if (error) {
    return (
      <pre className="mt-3 max-h-[min(320px,50vh)] overflow-auto rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-[11px] leading-relaxed text-red-200/90">
        {error.message}
      </pre>
    );
  }
  return (
    <pre className="mt-3 max-h-[min(320px,50vh)] overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-emerald-200/90">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
