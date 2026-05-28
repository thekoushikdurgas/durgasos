'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNeonFlicker } from '@/hooks/use-neon-flicker';

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
  const { flickering, triggerHoverFlicker } = useNeonFlicker({
    onBurstComplete: () => {
      if (texts.length > 1) setTextIndex((i) => (i + 1) % texts.length);
    },
  });

  const label = texts[textIndex % texts.length] ?? texts[0] ?? '';

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
      <span className="neon-blink-brand__text truncate">{label}</span>
    </span>
  );
}
