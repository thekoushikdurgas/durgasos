'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useInViewOnce(
  ref: RefObject<Element | null>,
  options?: { rootMargin?: string; threshold?: number }
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options?.rootMargin ?? '-50px',
        threshold: options?.threshold ?? 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, inView, options?.rootMargin, options?.threshold]);

  return inView;
}
