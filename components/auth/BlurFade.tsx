'use client';

import { motion, useInView, useReducedMotion, type Variants } from 'motion/react';
import { useRef, type ReactNode } from 'react';

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
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
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const inViewResult = useInView(ref, {
    once: true,
    margin: '-50px',
  } as NonNullable<Parameters<typeof useInView>[1]>);
  const isInView = !inView || inViewResult;

  if (prefersReducedMotion === true) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: 'blur(0px)' },
  };
  const combinedVariants = variant || defaultVariants;
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      exit="hidden"
      variants={combinedVariants}
      transition={{ delay: 0.04 + delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
