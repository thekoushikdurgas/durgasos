'use client';

import { useCallback, useMemo, useState } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import { useOS } from '@/components/os-context';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  DEFAULT_MESSAGE_DOCK_CHARACTERS,
  MessageDock,
  type Character,
} from '@/components/ui/message-dock';
import { MagnifiedDockStrip, type MagnifiedDockItem } from '@/components/ui/magnified-dock-strip';
import { APPS, type AppId } from '@/lib/apps';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

/** Pixels to translate dock down so it clears the viewport (tall pills + bottom-4 + wrap). */
const DOCK_RECESS_PX = 200;

export function Dock() {
  const isMobile = useIsMobile();
  const {
    windows,
    openApp,
    activeWindow,
    focusWindow,
    minimizeWindow,
    openLauncher,
    closeLauncher,
    isLauncherOpen,
    launchingApps,
  } = useOS();
  const { installedIds } = useInstalledApps();
  const [lastSentPreview, setLastSentPreview] = useState<string | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const recessDock = useMemo(() => {
    const w = windows.find((x) => x.id === activeWindow && !x.isMinimized);
    return Boolean(w?.isMaximized);
  }, [windows, activeWindow]);

  const handleMessageSend = useCallback((message: string, character: Character, _index: number) => {
    void _index;
    setLastSentPreview(`${character.name}: ${message}`);
  }, []);

  const defaultDockPins: AppId[] = [
    'explorer',
    'void-ide',
    'browser',
    'workflow',
    'resume',
    'settings',
  ];
  const pinnedAppIds = defaultDockPins.filter((id) => installedIds.has(id));
  const openAppIds = windows.map((w) => w.appId);
  const launchingAppIds = Object.keys(launchingApps) as AppId[];
  const dockApps = Array.from(new Set([...pinnedAppIds, ...openAppIds, ...launchingAppIds]));

  const items: MagnifiedDockItem[] = dockApps.flatMap((appId) => {
    const app = APPS[appId as keyof typeof APPS];
    if (!app) return [];

    const appWindows = windows.filter((w) => w.appId === appId);
    const isOpen = appWindows.length > 0;
    const isActive = appWindows.some((w) => w.id === activeWindow && !w.isMinimized);
    const isLaunching = launchingApps[appId as keyof typeof launchingApps];

    const item: MagnifiedDockItem = {
      id: appId,
      label: app.name,
      indicator: isOpen,
      active: isActive,
      isLaunching,
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

  const dockStyle = useReducedMotionStyle(
    {
      y: recessDock ? DOCK_RECESS_PX : 0,
      opacity: reduceMotion && recessDock ? 0 : 1,
    },
    overlaySpring
  );

  if (isMobile) return null;

  return (
    <nav
      aria-label="Application dock and quick messages"
      className="pointer-events-none absolute bottom-4 left-0 right-0 z-[95] flex justify-center overflow-visible"
    >
      <SpringBox
        className="flex flex-wrap items-end justify-center gap-3 px-2"
        style={dockStyle}
        mapStyle={(s) => ({
          transform: `translate3d(0, ${s.y ?? 0}px, 0)`,
          opacity: s.opacity,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '0 0.5rem',
        })}
      >
        <div
          className={cn(
            'z-[55] flex max-w-[min(100%,28rem)] flex-col items-center gap-1',
            recessDock ? 'pointer-events-none' : 'pointer-events-auto'
          )}
        >
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
          contentClassName="flex flex-row items-center justify-center gap-[5px] py-[5px]"
          className={cn(
            'h-fit w-fit shrink-0 rounded-[50px] border border-white/20 px-[10px]',
            recessDock ? 'pointer-events-none' : 'pointer-events-auto'
          )}
        >
          <button
            type="button"
            aria-label={isLauncherOpen ? 'Close app launcher' : 'Open app launcher'}
            aria-expanded={isLauncherOpen}
            onClick={(e) => {
              e.stopPropagation();
              if (isLauncherOpen) closeLauncher('dock-button');
              else openLauncher();
            }}
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-[50px] shadow-lg outline-none',
              'bg-gradient-to-tr from-cyan-400 to-blue-600 transition-transform',
              'hover:scale-105 active:scale-95',
              'motion-reduce:transition-none motion-reduce:hover:scale-100',
              'focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/80',
              isLauncherOpen && 'ring-2 ring-white/90 ring-offset-2 ring-offset-slate-900/80'
            )}
            style={{ transitionDuration: 'var(--duration-dock-bounce, 300ms)' }}
          >
            <span className="pointer-events-none grid grid-cols-2 gap-0.5" aria-hidden>
              <span className="h-2 w-2 rounded-sm bg-white/90" />
              <span className="h-2 w-2 rounded-sm bg-white/90" />
              <span className="h-2 w-2 rounded-sm bg-white/90" />
              <span className="h-2 w-2 rounded-sm bg-white/90" />
            </span>
          </button>

          <div className="h-10 w-px shrink-0 bg-white/10" aria-hidden />

          <div
            role="toolbar"
            aria-label="Pinned and open applications"
            className="flex min-h-0 flex-1 items-center justify-center"
          >
            <MagnifiedDockStrip items={items} className="h-full shrink-0 self-stretch" />
          </div>
        </LiquidGlassSurface>
      </SpringBox>
    </nav>
  );
}
