'use client';

import { Motion, spring } from 'react-motion';

import { meterSpring } from '@/lib/motion/spring-presets';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

export function StatBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const reduced = usePrefersReducedMotion();
  const widthPct = Math.min(100, pct);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums">{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <Motion
          style={{
            width: reduced ? widthPct : spring(widthPct, meterSpring),
          }}
        >
          {({ width }) => (
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 motion-gpu"
              style={{ width: `${width}%` }}
            />
          )}
        </Motion>
      </div>
    </div>
  );
}
