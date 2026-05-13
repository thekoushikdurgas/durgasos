import * as React from 'react';

import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  indeterminate?: boolean;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    return (
      <input
        ref={innerRef}
        type="checkbox"
        className={cn(
          'h-4 w-4 shrink-0 cursor-pointer rounded border border-white/25 bg-white/5 shadow-sm backdrop-blur-sm',
          'accent-[var(--color-accent-primary,#3b82f6)] checked:border-[var(--color-accent-primary,#3b82f6)] checked:bg-[var(--color-accent-primary,#3b82f6)]/20',
          'transition-[border-color,box-shadow] duration-150 ease-out',
          'hover:border-[var(--color-accent-primary,#3b82f6)]/70 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.35)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base,#050711)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
