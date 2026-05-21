'use client';

import * as React from 'react';
import { spring } from 'react-motion';

import { SpringBox } from '@/components/motion/SpringBox';
import { pressSpring } from '@/lib/motion/spring-presets';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function MotionField({
  children,
  focused,
  className,
}: {
  children: React.ReactNode;
  focused: boolean;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <SpringBox
      className={cn('rounded-lg', className)}
      style={{ ringOpacity: spring(focused ? 1 : 0, pressSpring) }}
      mapStyle={(s) => ({
        boxShadow:
          (s.ringOpacity ?? 0) > 0.5 ? '0 0 0 2px var(--color-accent-primary, #3b82f6)' : undefined,
      })}
    >
      {children}
    </SpringBox>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    return (
      <MotionField focused={focused}>
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur-md',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </MotionField>
    );
  }
);
Input.displayName = 'Input';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    return (
      <MotionField focused={focused}>
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-foreground backdrop-blur-md',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </MotionField>
    );
  }
);
Textarea.displayName = 'Textarea';
