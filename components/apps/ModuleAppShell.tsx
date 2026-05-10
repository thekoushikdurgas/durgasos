'use client';

import { useMemo, type ReactNode } from 'react';

import { ParticleTextEffect } from '@/components/ui/particle-text-effect';

export function ModuleAppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const subtitleWords = useMemo(() => (subtitle ? [subtitle] : []), [subtitle]);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitleWords.length > 0 ? (
          <div className="mt-1 h-9 w-full max-w-full">
            <ParticleTextEffect
              words={subtitleWords}
              pixelSteps={10}
              interactive={false}
              autoRotate={false}
              transparentTrail
              className="h-full w-full min-h-0"
              particleColor={{ r: 148, g: 163, b: 184 }}
            />
          </div>
        ) : null}
      </header>
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
