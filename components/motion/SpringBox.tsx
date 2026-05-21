'use client';

import { Motion, type MotionProps } from 'react-motion';
import { type CSSProperties, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SpringStyle = MotionProps['style'];

type SpringBoxProps = {
  style: SpringStyle;
  defaultStyle?: MotionProps['defaultStyle'];
  className?: string;
  onRest?: () => void;
  children?: ReactNode;
  /** Apply interpolated numbers to inline style (default). */
  mapStyle?: (s: Record<string, number>) => CSSProperties;
  as?: 'div' | 'span' | 'ul' | 'li' | 'section' | 'article' | 'button';
} & Omit<React.HTMLAttributes<HTMLElement>, 'style' | 'children'>;

function defaultMapStyle(s: Record<string, number>): CSSProperties {
  const out: CSSProperties = {};
  if (s.x != null || s.y != null) {
    const x = s.x ?? 0;
    const y = s.y ?? 0;
    out.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  if (s.scale != null) {
    const base = out.transform ?? '';
    out.transform = `${base} scale(${s.scale})`.trim();
  }
  if (s.opacity != null) out.opacity = s.opacity;
  if (s.width != null) out.width = s.width;
  if (s.height != null) out.height = s.height;
  if (s.maxHeight != null) {
    out.maxHeight = s.maxHeight;
    out.overflow = 'hidden';
  }
  return out;
}

export function SpringBox({
  style,
  defaultStyle,
  className,
  onRest,
  children,
  mapStyle = defaultMapStyle,
  as: Tag = 'div',
  ...rest
}: SpringBoxProps): ReactElement {
  const El = Tag;
  return (
    <Motion style={style} defaultStyle={defaultStyle} onRest={onRest}>
      {(interpolated) => (
        <El className={cn('motion-gpu', className)} style={mapStyle(interpolated)} {...rest}>
          {children}
        </El>
      )}
    </Motion>
  );
}
