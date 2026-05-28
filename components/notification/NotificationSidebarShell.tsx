'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Bell, CheckCheck, ChevronsUpDown, FileClock, Pin, PinOff, Trash2, X } from 'lucide-react';

import { LabelSpring, SidebarShellFrame } from '@/components/motion/SidebarShellFrame';
import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { NotificationSidebarExpandedProvider } from '@/components/notification/NotificationSidebarExpandedContext';
import type { PanelTab } from '@/components/notification/sidebar-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';
import { SHELL_Z } from '@/lib/shell-z-index';

function userInitials(email: string | null | undefined, username?: string | null): string {
  if (username?.trim()) return username.trim().slice(0, 2).toUpperCase();
  if (email?.trim()) return email.trim().slice(0, 2).toUpperCase();
  return 'OS';
}

type Props = {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  unreadCount: number;
  backendHealth: 'online' | 'degraded' | 'offline';
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  onMarkAllRead?: () => void;
  onClearNotifications?: () => void;
  onClearLogs?: () => void;
  hasNotifications: boolean;
  children: ReactNode;
};

export function NotificationSidebarShell({
  activeTab,
  onTabChange,
  onClose,
  unreadCount,
  backendHealth,
  pinned,
  onPinnedChange,
  onMarkAllRead,
  onClearNotifications,
  onClearLogs,
  hasNotifications,
  children,
}: Props) {
  const { user } = useAuthSession();
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const effectivePinned = isMobile || pinned;
  const expanded = effectivePinned || hoverExpanded;

  const handleMouseEnter = useCallback(() => {
    if (!effectivePinned) setHoverExpanded(true);
  }, [effectivePinned]);

  const handleMouseLeave = useCallback(() => {
    if (!effectivePinned) setHoverExpanded(false);
  }, [effectivePinned]);

  const backendDot =
    backendHealth === 'online'
      ? 'bg-emerald-400'
      : backendHealth === 'degraded'
        ? 'bg-amber-400'
        : 'bg-red-500';

  const navRowClass = (tab: PanelTab) =>
    cn(
      'flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-white/10 hover:text-cyan-300',
      activeTab === tab && 'bg-white/15 text-cyan-400'
    );

  return (
    <SidebarShellFrame
      expanded={expanded}
      pinned={effectivePinned}
      reducedMotion={reducedMotion}
      side="right"
      className={cn(
        'max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-[9600] max-md:w-full max-md:max-w-sm'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{ zIndex: SHELL_Z.notificationSidebar }}
    >
      <LiquidGlassSurface
        variant="liquid"
        className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none text-sm shadow-2xl"
        contentClassName="flex h-full min-h-0 flex-col p-0"
      >
        <ul className="flex h-full min-h-0 flex-col text-slate-400">
          <div className="flex h-[54px] w-full shrink-0 items-center border-b border-white/10 p-2">
            <div className="flex w-full items-center gap-1 justify-between">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex h-8 min-w-0 flex-1 items-center gap-2 px-2 text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Avatar className="size-6 rounded-md">
                      {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                      <AvatarFallback className="rounded-md bg-white/10 text-[10px] text-white">
                        {userInitials(user?.email, user?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <LabelSpring
                      show={expanded}
                      reducedMotion={reducedMotion}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <p className="truncate text-sm font-medium text-slate-200">
                        Notification Center
                      </p>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
                    </LabelSpring>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {activeTab === 'notifications' && hasNotifications && onMarkAllRead ? (
                    <DropdownMenuItem onClick={onMarkAllRead}>
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark all read
                    </DropdownMenuItem>
                  ) : null}
                  {activeTab === 'notifications' && onClearNotifications ? (
                    <DropdownMenuItem onClick={onClearNotifications}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear notifications
                    </DropdownMenuItem>
                  ) : null}
                  {activeTab === 'system' && onClearLogs ? (
                    <DropdownMenuItem onClick={onClearLogs}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear logs
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onClose}>
                    <X className="mr-2 h-4 w-4" />
                    Close center
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {expanded && !isMobile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white"
                  aria-expanded={pinned}
                  aria-label={pinned ? 'Unpin panel (compact on hover)' : 'Pin panel open'}
                  title={pinned ? 'Unpin' : 'Pin open'}
                  onClick={() => onPinnedChange(!pinned)}
                >
                  {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-col gap-1 p-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'notifications'}
              className={navRowClass('notifications')}
              onClick={() => onTabChange('notifications')}
              title="Notifications"
            >
              <div className="relative flex items-center justify-center">
                <Bell className="h-4 w-4 shrink-0" />
                {!expanded && unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                ) : null}
              </div>
              <LabelSpring
                show={expanded}
                reducedMotion={reducedMotion}
                className="flex items-center gap-2"
              >
                <span className="ml-2 text-sm font-medium">Notifications</span>
                {unreadCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="ml-auto h-fit border-none bg-blue-500/20 px-1.5 text-[10px] text-blue-300"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                ) : null}
              </LabelSpring>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'system'}
              className={navRowClass('system')}
              onClick={() => onTabChange('system')}
              title="System & Logs"
            >
              <div className="relative flex items-center justify-center">
                <FileClock className="h-4 w-4 shrink-0" />
                {!expanded ? (
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full',
                      backendDot
                    )}
                    aria-hidden
                  />
                ) : null}
              </div>
              <LabelSpring
                show={expanded}
                reducedMotion={reducedMotion}
                className="flex items-center gap-2"
              >
                <span className="ml-2 text-sm font-medium">System &amp; Logs</span>
                <span className={cn('ml-auto h-2 w-2 rounded-full', backendDot)} aria-hidden />
              </LabelSpring>
            </button>
          </div>

          <Separator className="mx-2 bg-white/10" />

          <ScrollArea className="min-h-0 flex-1">
            <NotificationSidebarExpandedProvider expanded={expanded}>
              <div className="flex min-h-0 flex-col">{children}</div>
            </NotificationSidebarExpandedProvider>
          </ScrollArea>
        </ul>
      </LiquidGlassSurface>
    </SidebarShellFrame>
  );
}
