'use client';

import { useMemo } from 'react';
import {
  Bell,
  FolderOpen,
  Globe,
  Grid3X3,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Search,
  Settings,
  Terminal,
} from 'lucide-react';
import { StretchBottomMenu, type StretchMenuItem } from '@/components/ui/stretch-bottom-menu';
import { SpringBox } from '@/components/motion/SpringBox';
import { useShellMenuActions } from '@/hooks/use-shell-menu-actions';
import { useOS } from '@/components/os-context';
import { APPS } from '@/lib/apps';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

/** Slide off-screen when a maximized app covers the shell (matches Dock recess). */
const MENU_RECESS_PX = 200;

export function BottomMenuBar() {
  const handleMenuAction = useShellMenuActions();
  const { activeWindow, windows } = useOS();
  const reduceMotion = usePrefersReducedMotion();
  const activeAppId = activeWindow ? windows.find((w) => w.id === activeWindow)?.appId : null;
  const activeApp = activeAppId ? APPS[activeAppId] : null;
  const activeWin = activeWindow ? windows.find((w) => w.id === activeWindow) : null;
  const recessMenu = Boolean(activeWin && !activeWin.isMinimized && activeWin.isMaximized);

  const menuStyle = useReducedMotionStyle(
    {
      y: recessMenu ? MENU_RECESS_PX : 0,
      opacity: reduceMotion && recessMenu ? 0 : 1,
    },
    overlaySpring
  );

  const items = useMemo<StretchMenuItem[]>(
    () => [
      {
        id: 'about',
        label: 'About Durgasos',
        action: 'about',
        icon: <Info className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'launcher',
        label: 'App Launcher',
        action: 'launcher',
        icon: <Search className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'files',
        label: 'Files',
        action: 'open-explorer',
        icon: <FolderOpen className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'web',
        label: 'Web',
        action: 'open-browser',
        icon: <Globe className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'terminal',
        label: 'Terminal',
        action: 'open-terminal',
        icon: <Terminal className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'gallery',
        label: 'Gallery',
        action: 'open-gallery',
        icon: <ImageIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'settings',
        label: 'Settings',
        action: 'preferences',
        icon: <Settings className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        action: 'notifications',
        icon: <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'widgets',
        label: 'Desktop Widgets',
        action: 'widgets',
        icon: <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
      {
        id: 'shortcuts',
        label: 'Shortcuts',
        action: 'help-shortcuts',
        icon: <Grid3X3 className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
      },
    ],
    []
  );

  return (
    <SpringBox
      className={cn(
        'pointer-events-none absolute bottom-4 left-4 z-[96] flex flex-col items-start gap-2',
        recessMenu && 'pointer-events-none'
      )}
      style={menuStyle}
      mapStyle={(s) => ({
        transform: `translate3d(0, ${s.y ?? 0}px, 0)`,
        opacity: s.opacity,
      })}
    >
      {activeApp && !recessMenu ? (
        <p
          className="pointer-events-none max-w-[14rem] truncate rounded-md border border-white/10 bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-slate-300 shadow-md backdrop-blur-md"
          aria-live="polite"
        >
          {activeApp.name}
        </p>
      ) : null}
      <StretchBottomMenu
        items={items}
        onSelect={handleMenuAction}
        defaultActiveId="launcher"
        recessed={recessMenu}
      />
    </SpringBox>
  );
}
