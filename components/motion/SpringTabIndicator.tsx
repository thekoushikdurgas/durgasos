'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import { tabIndicatorSpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { cn } from '@/lib/utils';

type SpringTabIndicatorProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  activeSelector: string;
  className?: string;
};

export function SpringTabIndicator({
  containerRef,
  activeSelector,
  className,
}: SpringTabIndicatorProps) {
  const [rect, setRect] = useState({ left: 0, width: 0 });
  const indicatorRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(activeSelector);
    if (!active) return;
    const rootRect = root.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    setRect({
      left: activeRect.left - rootRect.left,
      width: activeRect.width,
    });
  }, [containerRef, activeSelector]);

  useEffect(() => {
    measure();
    const root = containerRef.current;
    if (!root) return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll('[role="tab"]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure, containerRef, activeSelector]);

  const style = useReducedMotionStyle({ left: rect.left, width: rect.width }, tabIndicatorSpring);

  return (
    <SpringBox
      style={style}
      className={cn('pointer-events-none absolute bottom-0 h-full', className)}
      mapStyle={(s) => ({
        left: s.left,
        width: s.width,
        position: 'absolute',
        bottom: 0,
        top: 0,
      })}
    >
      <div ref={indicatorRef} className="h-full w-full" />
    </SpringBox>
  );
}
