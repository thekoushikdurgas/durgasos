'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Battery, Menu, Monitor, Search, Wifi } from 'lucide-react';
import { useOS } from '@/components/os-context';
import { SystemStatusIcons } from '@/components/SystemStatusIcons';
import {
  DesktopMenuBar,
  type MenuConfig,
  type MenuItemOption,
} from '@/components/ui/desktop-menu-bar';
import VaporizeTextCycle, { Tag } from '@/components/ui/vaporize-text-cycle';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

function getLogoMenu(): MenuItemOption[] {
  return [
    { label: 'About Durgasos', action: 'about' },
    { type: 'separator' },
    { label: 'Settings…', action: 'preferences', shortcut: '⌘,' },
    { label: 'App Launcher', action: 'launcher', shortcut: '␣' },
  ];
}

function getMenus(hasActiveWindow: boolean): MenuConfig[] {
  return [
    {
      label: 'File',
      items: [
        { label: 'New Window', action: 'new-window', shortcut: '⌘N' },
        { type: 'separator' },
        { label: 'Open Files', action: 'open-explorer', shortcut: '⌘O' },
        { label: 'Open Web', action: 'open-browser' },
        { label: 'Open Terminal', action: 'open-terminal' },
        { label: 'Open Gallery', action: 'open-gallery' },
        { type: 'separator' },
        {
          label: 'Close Window',
          action: 'close-window',
          shortcut: '⌘W',
          disabled: !hasActiveWindow,
        },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: '⌘Z', disabled: true },
        { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
        { type: 'separator' },
        { label: 'Cut', shortcut: '⌘X', disabled: true },
        { label: 'Copy', shortcut: '⌘C', disabled: true },
        { label: 'Paste', shortcut: '⌘V', disabled: true },
      ],
    },
    {
      label: 'View',
      items: [
        {
          label: 'Enter Full Screen',
          action: 'fullscreen',
          shortcut: '⌃⌘F',
          disabled: !hasActiveWindow,
        },
        { label: 'Show Notifications', action: 'notifications', shortcut: '⌘⇧N' },
      ],
    },
    {
      label: 'Window',
      items: [
        {
          label: 'Minimize',
          action: 'minimize',
          shortcut: '⌘M',
          disabled: !hasActiveWindow,
        },
        {
          label: 'Zoom',
          action: 'zoom',
          shortcut: '⌃⌘Z',
          disabled: !hasActiveWindow,
        },
        { type: 'separator' },
        {
          label: 'Close Window',
          action: 'close-window',
          shortcut: '⌘W',
          disabled: !hasActiveWindow,
        },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', action: 'help-shortcuts' },
        { label: 'About Durgasos', action: 'about' },
      ],
    },
  ];
}

export function TopBar() {
  const {
    activeWindow,
    windows,
    toggleNotifCenter,
    isNotifOpen,
    openApp,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    toggleLauncher,
  } = useOS();
  const isMobile = useIsMobile();
  const [time, setTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAppId = activeWindow ? windows.find((w) => w.id === activeWindow)?.appId : null;
  const activeApp = activeAppId ? APPS[activeAppId] : null;
  const hasActiveWindow = Boolean(activeWindow);

  const menus = useMemo(() => getMenus(hasActiveWindow), [hasActiveWindow]);
  const logoMenuItems = useMemo(() => getLogoMenu(), []);

  const handleMenuAction = useCallback(
    (action: string) => {
      setMobileMenuOpen(false);
      switch (action) {
        case 'about':
          window.alert('Durgasos — a playful desktop shell demo.');
          break;
        case 'preferences':
          openApp('settings');
          break;
        case 'launcher':
        case 'new-window':
          toggleLauncher();
          break;
        case 'open-explorer':
          openApp('explorer');
          break;
        case 'open-browser':
          openApp('browser');
          break;
        case 'open-terminal':
          openApp('terminal');
          break;
        case 'open-gallery':
          openApp('gallery');
          break;
        case 'close-window':
          if (activeWindow) closeWindow(activeWindow);
          break;
        case 'minimize':
          if (activeWindow) minimizeWindow(activeWindow);
          break;
        case 'zoom':
        case 'fullscreen':
          if (activeWindow) maximizeWindow(activeWindow);
          break;
        case 'notifications':
          toggleNotifCenter();
          break;
        case 'help-shortcuts':
          window.alert(
            'Menus: Arrow Down to open from a menu title, then Arrow Up/Down to move, Enter to choose, Escape to close.'
          );
          break;
        default:
          break;
      }
    },
    [
      activeWindow,
      closeWindow,
      maximizeWindow,
      minimizeWindow,
      openApp,
      toggleLauncher,
      toggleNotifCenter,
    ]
  );

  const MOBILE_QUICK = useMemo(
    () =>
      [
        { label: 'App Launcher', action: 'launcher' as const },
        { label: 'Files', action: 'open-explorer' as const },
        { label: 'Web', action: 'open-browser' as const },
        { label: 'Terminal', action: 'open-terminal' as const },
        { label: 'Gallery', action: 'open-gallery' as const },
        { label: 'Settings', action: 'preferences' as const },
        { label: 'Notifications', action: 'notifications' as const },
      ] as const,
    []
  );

  const mobileRootRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!isMobile || !mobileMenuOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (mobileRootRef.current?.contains(t)) return;
      setMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [isMobile, mobileMenuOpen]);

  if (isMobile) {
    return (
      <div ref={mobileRootRef} className="relative z-[60] w-full shrink-0">
        <LiquidGlassSurface
          variant="liquid"
          withLiquidShell={false}
          className="w-full rounded-none border-b border-white/10"
          contentClassName="w-full min-h-11 px-2 py-2"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md p-2 text-slate-200 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              aria-label="Open menu"
              aria-haspopup="menu"
              aria-controls={mobileMenuOpen ? mobileMenuId : undefined}
              aria-expanded={mobileMenuOpen ? 'true' : 'false'}
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen((o) => !o);
              }}
            >
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            <div className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {activeApp?.name ?? 'DurgasOS'}
            </div>
            <button
              type="button"
              aria-label="Open app launcher"
              className="rounded p-2 text-slate-300 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              onClick={(e) => {
                e.stopPropagation();
                toggleLauncher();
              }}
            >
              <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={isNotifOpen ? 'Hide notification center' : 'Show notification center'}
              className={cn(
                'rounded px-2 py-1 text-xs font-semibold tabular-nums outline-none transition-colors',
                'hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/40',
                isNotifOpen ? 'text-blue-400' : 'text-slate-200 hover:text-white'
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleNotifCenter();
              }}
            >
              {time}
            </button>
          </div>
          {mobileMenuOpen ? (
            <div
              id={mobileMenuId}
              className="absolute left-2 top-full z-[70] mt-1 max-h-[min(70vh,24rem)] w-60 overflow-auto rounded-lg border border-white/10 bg-slate-950/95 py-1 shadow-2xl backdrop-blur-md"
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              {MOBILE_QUICK.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm text-slate-100 outline-none hover:bg-white/10 focus-visible:bg-white/10"
                  onClick={() => handleMenuAction(item.action)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </LiquidGlassSurface>
      </div>
    );
  }

  return (
    // Menubar stays in-flow so <header> reserves height; absolute removed the header from layout
    // and maximized windows (inset-0 in the desktop pane) drew from y=0 under the menu.
    <DesktopMenuBar
      className="relative z-[60] w-full shrink-0"
      logoMenuItems={logoMenuItems}
      menus={menus}
      onMenuAction={handleMenuAction}
      activeAppName={activeApp?.name ?? null}
      brandSlot={
        <div className="h-5 min-w-[4.5rem] max-w-[9rem] shrink">
          <VaporizeTextCycle
            className="h-full w-full"
            texts={['Durgasos', 'Durgas OS']}
            font={{
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
            }}
            color="rgb(248, 250, 252)"
            alignment="left"
            direction="left-to-right"
            tag={Tag.P}
            spread={3}
            density={6}
            animation={{
              vaporizeDuration: 2.2,
              fadeInDuration: 0.85,
              waitDuration: 1.1,
            }}
          />
        </div>
      }
      rightSlot={
        <>
          <div
            className="hidden sm:inline-flex items-center"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Connection status"
          >
            <SystemStatusIcons />
          </div>
          <button
            type="button"
            aria-label="Open app launcher"
            title="Search / Launcher"
            className="rounded p-1 text-slate-300 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/40"
            onClick={(e) => {
              e.stopPropagation();
              toggleLauncher();
            }}
          >
            <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <span className="text-slate-400" title="Display (simulated)" aria-hidden>
            <Monitor className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="text-slate-400" title="Network (simulated)" aria-hidden>
            <Wifi className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="text-slate-400" title="Power (simulated)" aria-hidden>
            <Battery className="h-4 w-4" strokeWidth={2} />
          </span>
          <button
            type="button"
            aria-label={isNotifOpen ? 'Hide notification center' : 'Show notification center'}
            className={cn(
              'rounded px-1.5 py-0.5 font-semibold tabular-nums outline-none transition-colors',
              'hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/40',
              isNotifOpen ? 'text-blue-400' : 'text-slate-200 hover:text-white'
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleNotifCenter();
            }}
          >
            {time}
          </button>
        </>
      }
    />
  );
}
