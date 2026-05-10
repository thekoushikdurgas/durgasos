'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Battery, Monitor, Search, Wifi } from 'lucide-react';
import { useOS } from '@/components/os-context';
import {
  DesktopMenuBar,
  type MenuConfig,
  type MenuItemOption,
} from '@/components/ui/desktop-menu-bar';
import VaporizeTextCycle, { Tag } from '@/components/ui/vaporize-text-cycle';
import { APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';

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
  const [time, setTime] = useState('');

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

  return (
    <DesktopMenuBar
      className="absolute top-0 left-0 z-[60] w-full"
      logoMenuItems={logoMenuItems}
      menus={menus}
      onMenuAction={handleMenuAction}
      activeAppName={activeApp?.name ?? null}
      brandSlot={
        <>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gradient-to-tr from-cyan-500 to-blue-600 text-[10px] text-white shadow-sm">
            D
          </div>
          {/* Performance: one vapor canvas in the shell menubar; pauses off-screen via VaporizeTextCycle */}
          <span className="sr-only">Durgasos</span>
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
        </>
      }
      rightSlot={
        <>
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
