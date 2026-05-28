'use client';

import React from 'react';

import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

/** Fixed id referenced by liquid-layer CSS filter(); mount `<GlassFilter />` once in the document root. */
export const GLASS_DISTORTION_FILTER_ID = 'glass-distortion';

export function GlassFilter() {
  return (
    <svg style={{ display: 'none' }} aria-hidden>
      <filter
        id={GLASS_DISTORTION_FILTER_ID}
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves={1}
          seed="17"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="200"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

export interface LiquidGlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'liquid' | 'frost';
  /** When false, skips `.liquid-glass-shell` (outer shadow); use for flush strips like the menu bar. Default true. */
  withLiquidShell?: boolean;
  /** Liquid tier only: merged into the inner content wrapper (`div.relative.z-30`). */
  contentClassName?: string;
  /** Liquid tier only: merged into the z-10 frost tint layer (defaults to `--color-liquid-frost-tint-strong`). */
  liquidFrostStyle?: React.CSSProperties;
}

/**
 * Tiered glass surface: `liquid` uses SVG displacement + layered frost (heavier); `frost` uses backdrop blur only.
 * Respects `prefers-reduced-motion` by downgrading `liquid` → `frost`.
 */
export const LiquidGlassSurface = React.forwardRef<HTMLDivElement, LiquidGlassSurfaceProps>(
  (
    {
      variant = 'frost',
      withLiquidShell = true,
      className,
      children,
      contentClassName,
      liquidFrostStyle,
      ...props
    },
    ref
  ) => {
    const reducedMotion = usePrefersReducedMotion();
    const effectiveVariant = reducedMotion ? 'frost' : variant;

    if (effectiveVariant === 'frost') {
      return (
        <div
          ref={ref}
          className={cn(
            'relative rounded-[inherit] text-foreground',
            'frost-glass-surface',
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex rounded-[inherit] text-slate-100',
          withLiquidShell && 'transition-all duration-liquid ease-liquid liquid-glass-shell',
          className
        )}
        {...props}
      >
        <div
          className="absolute inset-0 z-0 rounded-[inherit]"
          style={{
            backdropFilter: 'blur(3px)',
            filter: `url(#${GLASS_DISTORTION_FILTER_ID})`,
            isolation: 'isolate',
          }}
        />
        <div
          className="absolute inset-0 z-10 rounded-[inherit]"
          style={{
            background: 'var(--color-liquid-frost-tint-strong)',
            ...liquidFrostStyle,
          }}
        />
        <div
          className={cn('absolute inset-0 z-20 h-full rounded-[inherit]', 'liquid-glass-inset')}
        />
        <div className={cn('relative z-30 flex min-h-0 min-w-0 flex-1 flex-col', contentClassName)}>
          {children}
        </div>
      </div>
    );
  }
);
LiquidGlassSurface.displayName = 'LiquidGlassSurface';

export interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  surfaceClassName?: string;
}

/** Primary-action style button with liquid glass shell (uses frost tier when reduced-motion). */
export function LiquidGlassButton({
  children,
  className,
  surfaceClassName,
  ...props
}: LiquidGlassButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-3xl border-0 bg-transparent p-0 text-left text-inherit cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      {...props}
    >
      <LiquidGlassSurface
        variant="liquid"
        className={cn('rounded-3xl px-8 py-4 shadow-liquid-glass', surfaceClassName)}
      >
        {children}
      </LiquidGlassSurface>
    </button>
  );
}
