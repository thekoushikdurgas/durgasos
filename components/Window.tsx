'use client';

import React, { useCallback } from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';

import { SpringBox } from '@/components/motion/SpringBox';
import { usePointerDragSpring } from '@/components/motion/use-pointer-drag-spring';
import { useOS } from '@/components/os-context';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { WindowLaunchProvider } from '@/components/window-launch-context';
import type { LaunchPayload } from '@/lib/window-launch';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { clampWindowZIndex, MAX_WINDOW_Z_INDEX } from '@/lib/shell-z-index';

interface WindowProps {
  id: string;
  appId: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  launch?: LaunchPayload;
  children: React.ReactNode;
}

export function Window({
  id,
  appId,
  isMinimized,
  isMaximized,
  zIndex,
  launch,
  children,
}: WindowProps) {
  const { closeWindow, minimizeWindow, maximizeWindow, focusWindow, activeWindow } = useOS();
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const { style: dragStyle, dragHandlers } = usePointerDragSpring({ x: 0, y: 0 });

  const app = APPS[appId as keyof typeof APPS];
  const AppIcon = app.icon;
  const isActive = activeWindow === id;
  const layoutAsMaximized = isMaximized || isMobile;

  const stackZ = clampWindowZIndex(zIndex);
  const effectiveZ =
    layoutAsMaximized && isActive ? Math.min(Math.max(stackZ, 50), MAX_WINDOW_Z_INDEX) : stackZ;

  const enterStyle = useReducedMotionStyle(
    {
      opacity: 1,
      scale: 1,
      x: layoutAsMaximized ? 0 : (dragStyle.x as number),
      y: layoutAsMaximized ? 0 : (dragStyle.y as number),
    },
    overlaySpring
  );

  const updateGlowEdge = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const { left, top, width, height } = target.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    if (angle < 0) angle += 360;

    target.style.setProperty('--app-edge-x', `${Math.min(Math.max((x / width) * 100, 0), 100)}%`);
    target.style.setProperty('--app-edge-y', `${Math.min(Math.max((y / height) * 100, 0), 100)}%`);
    target.style.setProperty('--app-edge-angle', `${angle.toFixed(2)}deg`);
    target.style.setProperty('--app-edge-strength', `${(edge * 100).toFixed(2)}`);
  }, []);

  if (isMinimized) return null;

  const canDrag = !layoutAsMaximized && !isMobile;

  return (
    <SpringBox
      data-os-window
      className={cn(
        'app-glowing-edge-window absolute flex flex-col transition-[opacity,box-shadow,border-color] duration-200 motion-gpu',
        layoutAsMaximized
          ? 'inset-0 rounded-none'
          : 'rounded-xl border border-white/20 w-[800px] h-[550px]',
        isActive ? 'border-white/30' : ''
      )}
      defaultStyle={{ opacity: 0, scale: 0.95, x: 0, y: 0 }}
      style={
        reduced
          ? { opacity: 1, scale: 1, x: 0, y: 0 }
          : {
              opacity: enterStyle.opacity,
              scale: enterStyle.scale,
              x: canDrag ? dragStyle.x : 0,
              y: canDrag ? dragStyle.y : 0,
            }
      }
      mapStyle={(s) => ({
        zIndex: effectiveZ,
        top: layoutAsMaximized ? 0 : '10%',
        left: layoutAsMaximized ? 0 : '15%',
        opacity: s.opacity,
        transform: `translate3d(${s.x ?? 0}px, ${s.y ?? 0}px, 0) scale(${s.scale ?? 1})`,
        boxShadow: isActive
          ? 'var(--shadow-window-active, 0 24px 80px rgba(0,0,0,0.65))'
          : 'var(--shadow-window-inactive, 0 8px 32px rgba(0,0,0,0.3))',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
      })}
      onPointerMove={updateGlowEdge}
    >
      <span className="app-window-edge-glow" aria-hidden />
      <LiquidGlassSurface
        variant="liquid"
        className={cn(
          'flex h-full min-h-0 w-full flex-col rounded-[inherit]',
          layoutAsMaximized && 'rounded-none'
        )}
      >
        <div
          data-window-titlebar
          className={cn(
            'window-titlebar select-none',
            isActive ? 'window-titlebar--active' : 'window-titlebar--inactive',
            isMobile && 'touch-none'
          )}
          {...(canDrag ? dragHandlers : {})}
          onPointerDown={(e) => {
            focusWindow(id);
            if ((e.target as HTMLElement).closest('[data-window-caption]')) return;
            dragHandlers.onPointerDown(e);
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-window-caption]')) return;
            maximizeWindow(id);
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <AppIcon
              className={cn('h-4 w-4 shrink-0', app.color, !isActive && 'opacity-60')}
              strokeWidth={2}
              aria-hidden
            />
            <span
              className={cn(
                'truncate text-sm font-medium',
                isActive
                  ? 'text-[color:var(--window-titlebar-fg)]'
                  : 'text-[color:var(--window-titlebar-fg-muted)]'
              )}
            >
              {app.name}
            </span>
          </div>
          <div
            className="flex shrink-0 items-stretch"
            data-window-caption
            role="toolbar"
            aria-label="Window controls"
          >
            <button
              type="button"
              className="window-caption-btn"
              title="Minimize"
              aria-label="Minimize"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                focusWindow(id);
                minimizeWindow(id);
              }}
            >
              <Minus className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="window-caption-btn"
              title={layoutAsMaximized ? 'Restore' : 'Maximize'}
              aria-label={layoutAsMaximized ? 'Restore' : 'Maximize'}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                focusWindow(id);
                maximizeWindow(id);
              }}
            >
              {layoutAsMaximized ? (
                <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              ) : (
                <Square className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="window-caption-btn window-caption-btn--close"
              title="Close"
              aria-label="Close"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                focusWindow(id);
                closeWindow(id);
              }}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 bg-slate-950 pointer-events-auto"
          onPointerDown={() => focusWindow(id)}
        >
          <WindowLaunchProvider value={{ ...(launch ?? {}), windowId: id }}>
            {children}
          </WindowLaunchProvider>
        </div>
      </LiquidGlassSurface>
    </SpringBox>
  );
}
