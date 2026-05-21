'use client';

import { useRef, type ReactNode } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import { useInViewOnce } from '@/lib/motion/use-in-view-once';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

export function BlurFade({
  children,
  className,
  yOffset = 6,
  inView = true,
  blur = '6px',
}: {
  children: ReactNode;
  className?: string;
  variant?: { hidden: { y: number }; visible: { y: number } };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  blur?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const inViewResult = useInViewOnce(ref, { rootMargin: '-50px' });
  const isInView = !inView || inViewResult;
  const visible = isInView;

  const style = useReducedMotionStyle(
    visible ? { opacity: 1, y: -yOffset } : { opacity: 0, y: yOffset },
    overlaySpring
  );

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <SpringBox
        style={style}
        mapStyle={(s) => ({
          opacity: s.opacity,
          transform: `translate3d(0, ${s.y ?? 0}px, 0)`,
          filter: visible ? 'blur(0px)' : `blur(${blur})`,
          transition: 'filter 0.4s ease-out',
        })}
      >
        {children}
      </SpringBox>
    </div>
  );
}
