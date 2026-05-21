import { spring } from 'react-motion';

import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

export type SpringConfig = {
  stiffness?: number;
  damping?: number;
  precision?: number;
};

/** Build react-motion style value: spring target or instant number when reduced motion. */
export function toSpringValue(
  target: number,
  reduced: boolean,
  config?: SpringConfig
): number | ReturnType<typeof spring> {
  if (reduced) return target;
  return spring(target, config);
}

export function useSpringValue(
  target: number,
  config?: SpringConfig
): number | ReturnType<typeof spring> {
  const reduced = usePrefersReducedMotion();
  return toSpringValue(target, reduced, config);
}
