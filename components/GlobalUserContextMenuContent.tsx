'use client';

import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { useOS } from '@/components/os-context';
import { APPS, type AppId } from '@/lib/apps';
import { clearSession } from '@/lib/establish-session';
import { cn } from '@/lib/utils';
import { Bell, Info, LayoutGrid, LogOut, Maximize2, Minimize2, X } from 'lucide-react';

const itemClass =
  'flex cursor-pointer items-center gap-2 focus:bg-accent/70 data-[highlighted]:bg-accent/70';

/** Launcher / menubar order: Files, Web, Terminal, Gallery, Settings */
const APP_MENU_ORDER: AppId[] = ['explorer', 'browser', 'terminal', 'gallery', 'settings'];

export function GlobalUserContextMenuContent() {
  const router = useRouter();
  const {
    openApp,
    toggleLauncher,
    toggleNotifCenter,
    activeWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
  } = useOS();

  const hasActiveWindow = Boolean(activeWindow);

  return (
    <>
      <ContextMenuLabel className="flex cursor-default items-center gap-3 font-normal">
        <Avatar className="size-9 border border-border">
          <AvatarFallback className="bg-gradient-to-tr from-cyan-600 to-blue-700 text-xs font-bold text-white">
            D
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-foreground">DurgasOS</span>
          <span className="truncate text-xs text-muted-foreground">
            Local session · right-click shell menu
          </span>
        </div>
      </ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem className={`${itemClass} font-medium`} onSelect={() => toggleLauncher()}>
        <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
        App Launcher
      </ContextMenuItem>
      <ContextMenuItem className={itemClass} onSelect={() => toggleNotifCenter()}>
        <Bell className="size-4 shrink-0 text-muted-foreground" />
        Notifications
      </ContextMenuItem>

      <ContextMenuSeparator />

      {APP_MENU_ORDER.map((appId) => {
        const app = APPS[appId];
        const Icon = app.icon;
        return (
          <ContextMenuItem key={appId} className={itemClass} onSelect={() => openApp(appId)}>
            <Icon className={cn('size-4 shrink-0', app.color)} strokeWidth={2} aria-hidden />
            Open {app.name}
          </ContextMenuItem>
        );
      })}

      <ContextMenuSeparator />

      <ContextMenuItem
        className={itemClass}
        disabled={!hasActiveWindow}
        onSelect={() => {
          if (activeWindow) minimizeWindow(activeWindow);
        }}
      >
        <Minimize2 className="size-4 shrink-0 text-muted-foreground" />
        Minimize window
      </ContextMenuItem>
      <ContextMenuItem
        className={itemClass}
        disabled={!hasActiveWindow}
        onSelect={() => {
          if (activeWindow) maximizeWindow(activeWindow);
        }}
      >
        <Maximize2 className="size-4 shrink-0 text-muted-foreground" />
        Zoom window
      </ContextMenuItem>
      <ContextMenuItem
        className={`${itemClass} text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive`}
        disabled={!hasActiveWindow}
        onSelect={() => {
          if (activeWindow) closeWindow(activeWindow);
        }}
      >
        <X className="size-4 shrink-0" />
        Close window
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        className={itemClass}
        onSelect={() => {
          window.alert('Durgasos — a playful desktop shell demo.');
        }}
      >
        <Info className="size-4 shrink-0 text-muted-foreground" />
        About DurgasOS
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        className={`${itemClass} font-medium text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive`}
        onSelect={() => {
          void (async () => {
            try {
              await clearSession();
              router.push('/welcome');
              router.refresh();
            } catch (err) {
              console.error('[durgasos] End session failed', err);
            }
          })();
        }}
      >
        <LogOut className="size-4 shrink-0" />
        End session
      </ContextMenuItem>
    </>
  );
}
