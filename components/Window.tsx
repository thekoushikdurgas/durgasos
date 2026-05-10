'use client';

import { useOS } from '@/components/os-context';
import { motion, useDragControls } from 'motion/react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { WindowLaunchProvider } from '@/components/window-launch-context';
import type { LaunchPayload } from '@/lib/window-launch';
import React, { useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const app = APPS[appId as keyof typeof APPS];
  const isActive = activeWindow === id;

  if (isMinimized) return null;

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'absolute flex flex-col overflow-hidden transition-all duration-200',
        isMaximized
          ? 'inset-0 rounded-none'
          : 'rounded-xl border border-white/20 w-[800px] h-[550px]',
        isActive ? 'shadow-black/60 border-white/30' : 'shadow-black/20'
      )}
      style={{ zIndex, top: isMaximized ? 0 : '10%', left: isMaximized ? 0 : '15%' }}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      drag={!isMaximized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onPointerDown={() => focusWindow(id)}
    >
      <LiquidGlassSurface
        variant="liquid"
        className={cn(
          'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[inherit]',
          isMaximized && 'rounded-none'
        )}
      >
        {/* Title Bar (macOS/Windows hybrid) */}
        <div
          className={cn(
            'h-10 flex items-center justify-between px-3 select-none flex-shrink-0 transition-colors border-b border-white/10',
            isActive ? 'bg-white/5' : 'bg-transparent/50'
          )}
          onPointerDown={(e) => {
            focusWindow(id);
            dragControls.start(e);
          }}
          onDoubleClick={() => maximizeWindow(id)}
        >
          {/* Left window controls (macOS style cue) */}
          <div className="flex gap-2 items-center w-24">
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeWindow(id);
              }}
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center group"
            >
              <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                minimizeWindow(id);
              }}
              className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 flex items-center justify-center group"
            >
              <Minus className="w-2 h-2 text-yellow-900 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                maximizeWindow(id);
              }}
              className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 flex items-center justify-center group"
            >
              {isMaximized ? (
                <Copy className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
              ) : (
                <Square className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>

          {/* Title */}
          {/* Plain text: avoid one particle/vapor canvas per window (CPU); menubar + welcome + module subtitles are the budget */}
          <div className="flex-1 text-center text-xs opacity-60 font-medium tracking-wide pointer-events-none">
            {app.name}
          </div>

          {/* Right empty spacer to keep title centered */}
          <div className="w-24"></div>
        </div>

        {/* App Content */}
        <div className="flex-1 bg-slate-950/40 relative overflow-hidden pointer-events-auto">
          <WindowLaunchProvider value={launch}>{children}</WindowLaunchProvider>
        </div>
      </LiquidGlassSurface>
    </motion.div>
  );
}
