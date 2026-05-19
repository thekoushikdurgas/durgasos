'use client';

import { useEffect, useState } from 'react';
import { isMobileRuntime } from '@/lib/platform';

const MOBILE_MAX_WIDTH_PX = 768;

/**
 * Viewport-based mobile layout (Capacitor / narrow browser).
 * Uses runtime hint so Capacitor is always treated as mobile shell.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX - 1}px)`);
    const update = () => setIsMobile(isMobileRuntime() || mq.matches);
    update();
    mq.addEventListener('change', update);
    window.addEventListener('orientationchange', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isMobile;
}
