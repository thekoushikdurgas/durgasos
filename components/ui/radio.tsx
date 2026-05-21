'use client';

import * as React from 'react';
import { spring } from 'react-motion';

import { SpringBox } from '@/components/motion/SpringBox';
import { pressSpring } from '@/lib/motion/spring-presets';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, checked, onChange, ...props }, ref) => {
    const reduced = usePrefersReducedMotion();
    const isChecked = Boolean(checked);

    return (
      <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
        <input
          ref={ref}
          type="radio"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <SpringBox
          style={{
            scale: reduced ? 1 : spring(isChecked ? 1.08 : 1, pressSpring),
          }}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 shadow-sm backdrop-blur-sm',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent-primary,#3b82f6)] peer-focus-visible:ring-offset-2',
            'peer-checked:border-[var(--color-accent-primary,#3b82f6)] peer-checked:shadow-[0_0_14px_rgba(59,130,246,0.45)]',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50'
          )}
          mapStyle={(s) => ({ transform: `scale(${s.scale ?? 1})` })}
        >
          {isChecked ? (
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary,#3b82f6)]" />
          ) : null}
        </SpringBox>
      </label>
    );
  }
);
Radio.displayName = 'Radio';
