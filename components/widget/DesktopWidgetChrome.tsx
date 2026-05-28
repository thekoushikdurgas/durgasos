'use client';

import type { ReactNode } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { cn } from '@/lib/utils';

type DesktopWidgetChromeProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidthClass?: string;
};

/** Shared liquid-glass frame for desktop widgets (matches weather / todo). */
export function DesktopWidgetChrome({
  children,
  className,
  contentClassName,
  maxWidthClass = 'max-w-[min(100vw-2rem,320px)]',
}: DesktopWidgetChromeProps) {
  const enterStyle = useReducedMotionStyle({ opacity: 1, y: 0 }, overlaySpring);

  return (
    <SpringBox
      className="pointer-events-auto"
      defaultStyle={{ opacity: 0, y: 8 }}
      style={enterStyle}
      mapStyle={(s) => ({
        opacity: s.opacity,
        transform: `translate3d(0, ${s.y ?? 0}px, 0)`,
      })}
    >
      <div
        className={cn(
          'w-full min-w-0 rounded-2xl border border-white/10 shadow-lg',
          maxWidthClass,
          className
        )}
      >
        <LiquidGlassSurface
          variant="liquid"
          className="h-full bg-white/8 p-4 text-white"
          contentClassName={cn('flex min-h-0 flex-col gap-3', contentClassName)}
        >
          {children}
        </LiquidGlassSurface>
      </div>
    </SpringBox>
  );
}
