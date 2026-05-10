'use client';

import { useCallback, useState } from 'react';
import { useOS } from '@/components/os-context';
import {
  DEFAULT_MESSAGE_DOCK_CHARACTERS,
  MessageDock,
  type Character,
} from '@/components/ui/message-dock';
import { MagnifiedDockStrip, type MagnifiedDockItem } from '@/components/ui/magnified-dock-strip';
import { APPS } from '@/lib/apps';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

export function Dock() {
  const { windows, openApp, activeWindow, focusWindow, minimizeWindow, toggleLauncher } = useOS();
  const [lastSentPreview, setLastSentPreview] = useState<string | null>(null);

  const handleMessageSend = useCallback((message: string, character: Character, _index: number) => {
    void _index;
    setLastSentPreview(`${character.name}: ${message}`);
  }, []);

  const pinnedAppIds = ['explorer', 'browser', 'settings'];
  const openAppIds = windows.map((w) => w.appId);
  const dockApps = Array.from(new Set([...pinnedAppIds, ...openAppIds]));

  const items: MagnifiedDockItem[] = dockApps.flatMap((appId) => {
    const app = APPS[appId as keyof typeof APPS];
    if (!app) return [];

    const appWindows = windows.filter((w) => w.appId === appId);
    const isOpen = appWindows.length > 0;
    const isActive = appWindows.some((w) => w.id === activeWindow && !w.isMinimized);

    const item: MagnifiedDockItem = {
      id: appId,
      label: app.name,
      indicator: isOpen,
      active: isActive,
      node: <app.icon className={cn('h-full w-full', app.color)} aria-hidden strokeWidth={2} />,
      onClick: () => {
        if (isOpen) {
          const firstWindow = appWindows[0];
          if (isActive) {
            minimizeWindow(firstWindow.id);
          } else {
            focusWindow(firstWindow.id);
          }
        } else {
          openApp(app.id);
        }
      },
    };

    return [item];
  });

  return (
    <nav
      aria-label="Application dock and quick messages"
      className="pointer-events-none absolute bottom-4 left-0 right-0 z-50 flex flex-wrap items-end justify-center gap-3 px-2"
    >
      <div className="pointer-events-auto z-[55] flex max-w-[min(100%,28rem)] flex-col items-center gap-1">
        {lastSentPreview ? (
          <p
            className="max-w-full truncate rounded-md border border-white/10 bg-black/45 px-2 py-1 text-center text-[10px] leading-tight text-slate-300 shadow-sm backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            Sent — {lastSentPreview}
          </p>
        ) : null}
        <MessageDock
          characters={DEFAULT_MESSAGE_DOCK_CHARACTERS}
          theme="dark"
          dockLayout="inline"
          onMessageSend={handleMessageSend}
          className="shrink-0"
        />
      </div>

      <LiquidGlassSurface
        variant="liquid"
        className={cn(
          'pointer-events-auto flex h-fit w-fit shrink-0 flex-row items-center justify-center gap-2 rounded-3xl border border-white/20 px-[10px]'
        )}
      >
        <button
          type="button"
          aria-label="Open app launcher"
          onClick={toggleLauncher}
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-[5px] shadow-lg outline-none',
            'bg-gradient-to-tr from-cyan-400 to-blue-600 transition-transform',
            'hover:scale-105 active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/80'
          )}
        >
          <span className="pointer-events-none grid grid-cols-2 gap-0.5" aria-hidden>
            <span className="h-2 w-2 rounded-sm bg-white/90" />
            <span className="h-2 w-2 rounded-sm bg-white/90" />
            <span className="h-2 w-2 rounded-sm bg-white/90" />
            <span className="h-2 w-2 rounded-sm bg-white/90" />
          </span>
        </button>

        <div className="h-10 w-px shrink-0 bg-white/10" aria-hidden />

        <MagnifiedDockStrip
          items={items}
          stripAriaLabel="Pinned and open applications"
          className="h-full shrink-0 self-stretch"
        />
      </LiquidGlassSurface>
    </nav>
  );
}
