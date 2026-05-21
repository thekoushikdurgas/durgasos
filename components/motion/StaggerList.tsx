'use client';

import { StaggeredMotion, spring } from 'react-motion';
import type { ReactElement, ReactNode } from 'react';

import { listItemSpring } from '@/lib/motion/spring-presets';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

type StaggerListProps<T> = {
  items: T[];
  /** Build per-item target style; may read previous interpolated row. */
  getStyle: (item: T, index: number, prev?: Record<string, number>[]) => Record<string, number>;
  className?: string;
  children: (item: T, index: number, style: Record<string, number>) => ReactNode;
};

export function StaggerList<T>({
  items,
  getStyle,
  className,
  children,
}: StaggerListProps<T>): ReactElement {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <div className={className}>
        {items.map((item, i) => {
          const s = getStyle(item, i);
          return (
            <div key={i} className="motion-gpu" style={{ opacity: s.opacity ?? 1 }}>
              {children(item, i, s)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <StaggeredMotion
      styles={(prev) =>
        items.map((item, i) => {
          const target = getStyle(item, i, prev);
          const style: Record<string, number | ReturnType<typeof spring>> = {};
          for (const [k, v] of Object.entries(target)) {
            style[k] = spring(v, listItemSpring);
          }
          return style;
        })
      }
    >
      {(interpolated) => (
        <div className={className}>
          {items.map((item, i) => (
            <div
              key={i}
              className="motion-gpu"
              style={{
                opacity: interpolated[i]?.opacity,
                transform: `translate3d(${interpolated[i]?.x ?? 0}px, 0, 0)`,
              }}
            >
              {children(item, i, interpolated[i] ?? {})}
            </div>
          ))}
        </div>
      )}
    </StaggeredMotion>
  );
}
