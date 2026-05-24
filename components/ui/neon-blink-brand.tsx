'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

const FLICKER_MS = 320;

export type NeonBlinkBrandProps = {
  /** Labels cycled after each flicker burst (when length > 1). */
  texts?: string[];
  className?: string;
  /** Menubar-sized glow; `default` matches the CodePen reference scale. */
  size?: 'compact' | 'default';
};

/**
 * Broken-neon brand text (see docs/frontend/ideas/main_Screen/neon-blink).
 * Random flicker loop + optional label rotation on burst end.
 */
export function NeonBlinkBrand({
  texts = ['Durgasos'],
  className,
  size = 'compact',
}: NeonBlinkBrandProps) {
  const [textIndex, setTextIndex] = useState(0);
  const [flickering, setFlickering] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleLoopRef = useRef<(() => void) | null>(null);

  const label = texts[textIndex % texts.length] ?? texts[0] ?? '';

  const clearTimers = useCallback(() => {
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    if (burstTimeoutRef.current) {
      clearTimeout(burstTimeoutRef.current);
      burstTimeoutRef.current = null;
    }
  }, []);

  const runBurst = useCallback(
    (burstsLeft: number, onDone: () => void) => {
      setFlickering(true);
      burstTimeoutRef.current = setTimeout(() => {
        setFlickering(false);
        const remaining = burstsLeft - 1;
        if (remaining > 0) {
          burstTimeoutRef.current = setTimeout(() => runBurst(remaining, onDone), 80 + Math.random() * 120);
        } else {
          if (texts.length > 1) {
            setTextIndex((i) => (i + 1) % texts.length);
          }
          onDone();
        }
      }, FLICKER_MS);
    },
    [texts.length]
  );

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const scheduleLoop = () => {
      const delay = 2000 + Math.random() * 4000;
      loopTimeoutRef.current = setTimeout(() => {
        const bursts = 1 + Math.floor(Math.random() * 3);
        runBurst(bursts, scheduleLoop);
      }, delay);
    };

    scheduleLoopRef.current = scheduleLoop;
    scheduleLoop();
    return clearTimers;
  }, [prefersReducedMotion, runBurst, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const triggerHoverFlicker = () => {
    if (prefersReducedMotion || flickering) return;
    clearTimers();
    runBurst(1, () => scheduleLoopRef.current?.());
  };

  return (
    <span
      className={cn(
        'neon-blink-brand inline-flex max-w-full min-w-0 items-center',
        size === 'compact' && 'neon-blink-brand--compact',
        size === 'default' && 'neon-blink-brand--default',
        flickering && 'is-flicker',
        className
      )}
      onMouseEnter={triggerHoverFlicker}
    >
      <span className="neon-blink-brand__text truncate" aria-hidden={false}>
        {label}
      </span>
    </span>
  );
}
