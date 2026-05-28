'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

const FLICKER_MS = 320;

type UseNeonFlickerOptions = {
  onBurstComplete?: () => void;
  /** When false, timers are cleared and no random/hover bursts run. Default true. */
  enabled?: boolean;
};

/** Random + hover neon flicker (main_Screen/neon-blink). */
export function useNeonFlicker(options?: UseNeonFlickerOptions) {
  const enabled = options?.enabled ?? true;
  const onBurstCompleteRef = useRef(options?.onBurstComplete);
  const [flickering, setFlickering] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleLoopRef = useRef<(() => void) | null>(null);
  const runBurstRef = useRef<(burstsLeft: number, onDone?: () => void) => void>(() => {});

  useEffect(() => {
    onBurstCompleteRef.current = options?.onBurstComplete;
  }, [options?.onBurstComplete]);

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

  const runBurst = useCallback((burstsLeft: number, onDone?: () => void) => {
    setFlickering(true);
    burstTimeoutRef.current = setTimeout(() => {
      setFlickering(false);
      const remaining = burstsLeft - 1;
      if (remaining > 0) {
        burstTimeoutRef.current = setTimeout(
          () => runBurstRef.current(remaining, onDone),
          80 + Math.random() * 120
        );
      } else {
        onBurstCompleteRef.current?.();
        onDone?.();
      }
    }, FLICKER_MS);
  }, []);

  useEffect(() => {
    runBurstRef.current = runBurst;
  }, [runBurst]);

  const flickeringActive = enabled && !prefersReducedMotion && flickering;

  useEffect(() => {
    if (prefersReducedMotion || !enabled) {
      clearTimers();
      return undefined;
    }

    const scheduleLoop = () => {
      const delay = 2000 + Math.random() * 4000;
      loopTimeoutRef.current = setTimeout(() => {
        const bursts = 1 + Math.floor(Math.random() * 3);
        runBurstRef.current(bursts, scheduleLoop);
      }, delay);
    };

    scheduleLoopRef.current = scheduleLoop;
    scheduleLoop();
    return clearTimers;
  }, [prefersReducedMotion, enabled, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const triggerHoverFlicker = useCallback(() => {
    if (!enabled || prefersReducedMotion || flickering) return;
    clearTimers();
    runBurstRef.current(1, () => scheduleLoopRef.current?.());
  }, [enabled, prefersReducedMotion, flickering, clearTimers]);

  return { flickering: flickeringActive, triggerHoverFlicker };
}
