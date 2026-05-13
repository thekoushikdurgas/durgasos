import * as React from 'react';

import { cn } from '@/lib/utils';

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded-full border border-white/25 bg-white/5 shadow-sm backdrop-blur-sm',
        'accent-[var(--color-accent-primary,#3b82f6)] checked:border-[var(--color-accent-primary,#3b82f6)]',
        'transition-[border-color,box-shadow,transform] duration-150 ease-out',
        'hover:border-[var(--color-accent-primary,#3b82f6)]/70 hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]',
        'checked:shadow-[0_0_14px_rgba(59,130,246,0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base,#050711)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Radio.displayName = 'Radio';
