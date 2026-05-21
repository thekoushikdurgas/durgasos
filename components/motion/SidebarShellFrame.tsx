'use client';

import type { CSSProperties, ReactNode } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import {
  labelMotion,
  sidebarMotion,
  sidebarLabelSpring,
  sidebarWidthSpring,
} from '@/components/notification/sidebar-motion';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { cn } from '@/lib/utils';

type SidebarShellFrameProps = {
  expanded: boolean;
  reducedMotion: boolean;
  side?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
};

export function SidebarShellFrame({
  expanded,
  reducedMotion,
  side = 'right',
  className,
  style: frameStyle,
  onMouseEnter,
  onMouseLeave,
  onClick,
  children,
}: SidebarShellFrameProps) {
  const targets = expanded ? sidebarMotion.open : sidebarMotion.closed;
  const style = useReducedMotionStyle(targets, sidebarWidthSpring);
  if (reducedMotion) {
    return (
      <div
        className={cn('motion-gpu flex shrink-0 flex-col overflow-hidden', className)}
        style={{ width: targets.width, ...frameStyle }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn('flex shrink-0 flex-col', className)}
      style={frameStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <SpringBox
        className="h-full min-h-0 overflow-hidden"
        defaultStyle={targets}
        style={style}
        mapStyle={(s) => ({
          width: s.width,
          opacity: s.opacity,
          transform: `translate3d(${side === 'right' ? (s.x ?? 0) : -(s.x ?? 0)}px, 0, 0)`,
        })}
      >
        <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
      </SpringBox>
    </div>
  );
}

export function LabelSpring({
  show,
  reducedMotion,
  className,
  children,
}: {
  show: boolean;
  reducedMotion: boolean;
  className?: string;
  children: ReactNode;
}) {
  const targets = show ? labelMotion.open : labelMotion.closed;
  const style = useReducedMotionStyle(targets, sidebarLabelSpring);

  if (reducedMotion) {
    return (
      <span className={className} style={{ opacity: show ? 1 : 0 }}>
        {show ? children : null}
      </span>
    );
  }

  return (
    <SpringBox
      as="span"
      className={className}
      style={style}
      mapStyle={(s) => ({
        display: 'inline-flex',
        alignItems: 'center',
        transform: `translate3d(${s.x ?? 0}px, 0, 0)`,
        opacity: s.opacity,
      })}
    >
      {show ? children : null}
    </SpringBox>
  );
}
