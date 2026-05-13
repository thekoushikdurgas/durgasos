import * as React from 'react';

import { cn } from '@/lib/utils';

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  /** `linear` — bar fill; `circular` — compact ring for loading states */
  variant?: 'linear' | 'circular';
  /** Pixel size for circular variant */
  circularSize?: number;
};

export function Progress({
  className,
  value,
  max = 100,
  variant = 'linear',
  circularSize = 40,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const gradId = React.useId().replace(/:/g, '');

  if (variant === 'circular') {
    const r = (circularSize - 6) / 2;
    const c = circularSize / 2;
    const circumference = 2 * Math.PI * r;
    const dash = (pct / 100) * circumference;
    return (
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('inline-flex items-center justify-center', className)}
        style={{ width: circularSize, height: circularSize }}
        {...props}
      >
        <svg width={circularSize} height={circularSize} className="-rotate-90">
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="4"
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-300 ease-out"
          />
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent-primary, #3b82f6)" />
              <stop offset="100%" stopColor="var(--color-durgasos-cyan, #06b6d4)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/10 shadow-inner backdrop-blur-sm',
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-primary,#3b82f6)] to-[var(--color-durgasos-cyan,#06b6d4)] transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
