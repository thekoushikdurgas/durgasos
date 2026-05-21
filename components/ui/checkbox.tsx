'use client';

import * as React from 'react';
import { spring } from 'react-motion';

import { SpringBox } from '@/components/motion/SpringBox';
import { pressSpring } from '@/lib/motion/spring-presets';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  indeterminate?: boolean;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const reduced = usePrefersReducedMotion();
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    const isChecked = Boolean(checked);
    const scaleTarget = isChecked ? 1 : 0.85;

    return (
      <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
        <input
          ref={innerRef}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <SpringBox
          style={{
            scale: reduced ? (isChecked ? 1 : 0.85) : spring(scaleTarget, pressSpring),
            opacity: reduced ? 1 : spring(isChecked ? 1 : 0.9, pressSpring),
          }}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/25 bg-white/5 shadow-sm backdrop-blur-sm',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent-primary,#3b82f6)] peer-focus-visible:ring-offset-2',
            'peer-checked:border-[var(--color-accent-primary,#3b82f6)] peer-checked:bg-[var(--color-accent-primary,#3b82f6)]/20',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50'
          )}
          mapStyle={(s) => ({ transform: `scale(${s.scale ?? 1})`, opacity: s.opacity })}
        >
          {isChecked ? (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-cyan-300" aria-hidden>
              <path
                fill="currentColor"
                d="M10.2 2.4 4.5 8.1 1.8 5.4l-.9.9 3.6 3.6 6.3-6.3-.9-.9Z"
              />
            </svg>
          ) : null}
        </SpringBox>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
