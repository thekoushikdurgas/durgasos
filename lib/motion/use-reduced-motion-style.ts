'use client';

import { useMemo } from 'react';

import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

import { toSpringValue, type SpringConfig } from './spring-style';

/** Map numeric targets to spring configs or plain numbers when user prefers reduced motion. */
export function useReducedMotionStyle<T extends Record<string, number>>(
  targets: T,
  config?: SpringConfig
): Record<keyof T, number | ReturnType<typeof toSpringValue>> {
  const reduced = usePrefersReducedMotion();
  const targetKey = useMemo(() => JSON.stringify(targets), [targets]);
  const configKey = useMemo(() => JSON.stringify(config ?? {}), [config]);

  return useMemo(() => {
    const parsed = JSON.parse(targetKey) as T;
    const parsedConfig = JSON.parse(configKey) as SpringConfig | undefined;
    const out = {} as Record<keyof T, number | ReturnType<typeof toSpringValue>>;
    for (const key of Object.keys(parsed) as (keyof T)[]) {
      out[key] = toSpringValue(parsed[key], reduced, parsedConfig);
    }
    return out;
  }, [targetKey, configKey, reduced]);
}
