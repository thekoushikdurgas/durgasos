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
  pinned: boolean;
  reducedMotion: boolean;
  side?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  widthOpen?: number;
  widthClosed?: number;
} & React.HTMLAttributes<HTMLDivElement>;

export function SidebarShellFrame({
  expanded,
  pinned,
  reducedMotion,
  side = 'right',
  className,
  style: frameStyle,
  onMouseEnter,
  onMouseLeave,
  onClick,
  children,
  widthOpen = 240,
  widthClosed = 48.8,
  ...rest
}: SidebarShellFrameProps) {
  const layoutTarget = pinned ? { width: widthOpen } : { width: widthClosed };
  const visualTarget = expanded
    ? { width: widthOpen, opacity: 1, x: 0 }
    : { width: widthClosed, opacity: 1, x: 0 };

  const layoutStyle = useReducedMotionStyle(layoutTarget, sidebarWidthSpring);
  const visualStyle = useReducedMotionStyle(visualTarget, sidebarWidthSpring);

  if (reducedMotion) {
    const activeLayoutWidth = pinned ? widthOpen : widthClosed;
    const activeVisualWidth = expanded ? widthOpen : widthClosed;
    return (
      <div
        className={cn('relative flex shrink-0 flex-col h-screen overflow-visible', className)}
        style={{ width: activeLayoutWidth, ...frameStyle }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        {...rest}
      >
        <div
          className={cn(
            'fixed top-0 bottom-0 h-screen overflow-hidden shadow-2xl transition-all duration-300',
            side === 'left' ? 'left-0 border-r border-white/10' : 'right-0 border-l border-white/10'
          )}
          style={{ width: activeVisualWidth, zIndex: frameStyle?.zIndex }}
        >
          <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <SpringBox
      as="div"
      className={cn('relative flex shrink-0 flex-col h-screen overflow-visible', className)}
      style={layoutStyle}
      mapStyle={(s) => ({
        width: s.width,
        ...frameStyle,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      {...rest}
    >
      <SpringBox
        as="div"
        className={cn(
          'fixed top-0 bottom-0 h-screen min-h-0 overflow-hidden shadow-2xl',
          side === 'left' ? 'left-0 border-r border-white/10' : 'right-0 border-l border-white/10'
        )}
        defaultStyle={visualTarget}
        style={visualStyle}
        mapStyle={(s) => ({
          width: s.width,
          opacity: s.opacity ?? 1,
          transform: `translate3d(${side === 'right' ? (s.x ?? 0) : -(s.x ?? 0)}px, 0, 0)`,
          zIndex: frameStyle?.zIndex,
        })}
      >
        <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
      </SpringBox>
    </SpringBox>
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
