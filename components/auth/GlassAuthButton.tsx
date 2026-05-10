'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

const glassButtonVariants = cva(
  'relative isolate cursor-pointer rounded-full text-foreground outline-none',
  {
    variants: {
      size: {
        default: 'text-base font-medium',
        sm: 'text-sm font-medium',
        lg: 'text-lg font-medium',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

const glassButtonTextVariants = cva('relative block min-w-0 select-none tracking-tighter', {
  variants: {
    size: {
      default: 'px-6 py-3.5',
      sm: 'px-4 py-2',
      lg: 'px-8 py-4',
      icon: 'flex h-10 w-10 items-center justify-center',
    },
  },
  defaultVariants: { size: 'default' },
});

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      children,
      size,
      contentClassName,
      onClick,
      asChild = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const el = e.currentTarget.querySelector<HTMLElement>('[data-glass-cta]');
      if (el && e.target !== el) el.click();
    };

    const wrapClass = cn(
      'glass-button-wrap cursor-pointer rounded-full relative inline-flex min-w-0',
      className
    );

    const innerClasses = cn(
      glassButtonVariants({ size }),
      glassButtonTextVariants({ size }),
      'inline-flex max-w-full items-center justify-center gap-2 rounded-full border-0 bg-transparent',
      'transition-transform duration-liquid ease-liquid group-hover:scale-95',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      contentClassName
    );

    if (asChild) {
      return (
        <div className={wrapClass} onClick={handleWrapperClick}>
          <LiquidGlassSurface
            variant="liquid"
            className="group inline-flex min-w-0 rounded-full shadow-liquid-glass"
          >
            <Slot
              ref={ref as React.Ref<HTMLButtonElement>}
              className={innerClasses}
              data-glass-cta
              {...props}
            >
              {children}
            </Slot>
          </LiquidGlassSurface>
        </div>
      );
    }

    return (
      <div className={wrapClass} onClick={handleWrapperClick}>
        <LiquidGlassSurface
          variant="liquid"
          className="group inline-flex min-w-0 rounded-full shadow-liquid-glass"
        >
          <button
            type={type}
            className={innerClasses}
            ref={ref}
            data-glass-cta
            onClick={onClick}
            {...props}
          >
            {typeof children === 'string' || typeof children === 'number' ? (
              <span className="block truncate">{children}</span>
            ) : (
              children
            )}
          </button>
        </LiquidGlassSurface>
      </div>
    );
  }
);
GlassButton.displayName = 'GlassButton';

export { GlassButton, glassButtonVariants, glassButtonTextVariants };
