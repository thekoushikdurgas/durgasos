'use client';

import { useOS } from '@/components/os-context';
import { motion, useDragControls } from 'motion/react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { WindowLaunchProvider } from '@/components/window-launch-context';
import type { LaunchPayload } from '@/lib/window-launch';
import React from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';

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
  const dragControls = useDragControls();
  const isMobile = useIsMobile();

  const app = APPS[appId as keyof typeof APPS];
  const AppIcon = app.icon;
  const isActive = activeWindow === id;
  const layoutAsMaximized = isMaximized || isMobile;

  /** Only the focused maximized window gets the shell stack boost; otherwise new windows stay under z≈88 and look “open in the background”. */
  const effectiveZ = layoutAsMaximized && isActive ? Math.max(zIndex, 88) : zIndex;

  if (isMinimized) return null;

  return (
    <motion.div
      className={cn(
        'absolute flex flex-col overflow-hidden transition-[opacity,box-shadow,border-color] duration-200',
        layoutAsMaximized
          ? 'inset-0 rounded-none'
          : 'rounded-xl border border-white/20 w-[800px] h-[550px]',
        isActive ? 'border-white/30' : ''
      )}
      style={{
        zIndex: effectiveZ,
        top: layoutAsMaximized ? 0 : '10%',
        left: layoutAsMaximized ? 0 : '15%',
        boxShadow: isActive
          ? 'var(--shadow-window-active, 0 24px 80px rgba(0,0,0,0.65))'
          : 'var(--shadow-window-inactive, 0 8px 32px rgba(0,0,0,0.3))',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(layoutAsMaximized ? { x: 0, y: 0 } : {}),
      }}
      transition={
        layoutAsMaximized
          ? {
              x: { type: 'tween', duration: 0, ease: 'linear' },
              y: { type: 'tween', duration: 0, ease: 'linear' },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }
          : { duration: 0.2 }
      }
      exit={{ opacity: 0, scale: 0.95 }}
      drag={!layoutAsMaximized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onPointerDown={(e) => {
        const fromTitle = (e.target as HTMLElement | null)?.closest?.('[data-window-titlebar]');
        if (!fromTitle) focusWindow(id);
      }}
    >
      <LiquidGlassSurface
        variant="liquid"
        className={cn(
          'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[inherit]',
          layoutAsMaximized && 'rounded-none'
        )}
      >
        {/* Title bar: Win11 layout (icon + title left; caption buttons right), dark Fluent tokens */}
        <div
          data-window-titlebar
          className={cn(
            'window-titlebar select-none',
            isActive ? 'window-titlebar--active' : 'window-titlebar--inactive',
            isMobile && 'touch-none'
          )}
          onPointerDown={(e) => {
            focusWindow(id);
            if ((e.target as HTMLElement).closest('[data-window-caption]')) return;
            if (!isMaximized && !isMobile) {
              dragControls.start(e);
            }
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

        {/* App Content */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden pointer-events-auto">
          <WindowLaunchProvider value={{ ...(launch ?? {}), windowId: id }}>
            {children}
          </WindowLaunchProvider>
        </div>
      </LiquidGlassSurface>
    </motion.div>
  );
}
