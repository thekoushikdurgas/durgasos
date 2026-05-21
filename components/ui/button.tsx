'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { SpringBox } from '@/components/motion/SpringBox';
import { pressSpring } from '@/lib/motion/spring-presets';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { toSpringValue } from '@/lib/motion/spring-style';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Disable spring press feedback */
  disableMotion?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      disableMotion,
      onPointerDown,
      onPointerUp,
      ...props
    },
    ref
  ) => {
    const reduced = usePrefersReducedMotion();
    const [pressed, setPressed] = React.useState(false);
    const Comp = asChild ? Slot : 'button';

    const inner = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={(e) => {
          setPressed(true);
          onPointerDown?.(e);
        }}
        onPointerUp={(e) => {
          setPressed(false);
          onPointerUp?.(e);
        }}
        onPointerLeave={(e) => {
          setPressed(false);
          onPointerUp?.(e);
        }}
        {...props}
      />
    );

    if (disableMotion || reduced || asChild) {
      return inner;
    }

    const scale = pressed ? 0.97 : 1;
    return (
      <SpringBox
        as="span"
        className="inline-flex"
        style={{ scale: toSpringValue(scale, false, pressSpring) }}
        mapStyle={(s) => ({ transform: `scale(${s.scale ?? 1})`, display: 'inline-flex' })}
      >
        {inner}
      </SpringBox>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
