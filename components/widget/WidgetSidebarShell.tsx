'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ChevronsUpDown, LayoutGrid, Pin, PinOff, RotateCcw, X } from 'lucide-react';

import { LabelSpring, SidebarShellFrame } from '@/components/motion/SidebarShellFrame';
import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  onClose: () => void;
  onResetLayout: () => void;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  children: ReactNode;
};

export function WidgetSidebarShell({
  onClose,
  onResetLayout,
  pinned,
  onPinnedChange,
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

  return (
    <SidebarShellFrame
      expanded={expanded}
      reducedMotion={reducedMotion}
      side="left"
      className={cn(
        'fixed border-r border-white/10',
        'bottom-20 left-2 top-10 max-md:inset-y-0 max-md:left-0 max-md:bottom-0 max-md:top-0 max-md:max-w-sm'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{ zIndex: SHELL_Z.widgetSidebar }}
    >
      <LiquidGlassSurface
        variant="liquid"
        className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl max-md:rounded-none text-sm shadow-2xl"
        contentClassName="flex h-full min-h-0 flex-col p-0"
      >
        <ul className="flex h-full min-h-0 flex-col text-slate-400">
          <div className="flex h-[54px] w-full shrink-0 items-center border-b border-white/10 p-2">
            <div className="flex w-full items-center gap-1">
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
                      <p className="truncate text-sm font-medium text-slate-200">Desktop Widgets</p>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
                    </LabelSpring>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={onResetLayout}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset layout
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onClose}>
                    <X className="mr-2 h-4 w-4" />
                    Close panel
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
                  aria-label={pinned ? 'Unpin panel' : 'Pin panel open'}
                  title={pinned ? 'Unpin' : 'Pin open'}
                  onClick={() => onPinnedChange(!pinned)}
                >
                  {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex h-8 w-full shrink-0 items-center gap-2 px-3 text-cyan-400">
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <LabelSpring show={expanded} reducedMotion={reducedMotion}>
              <span className="text-sm font-medium">Widget catalog</span>
            </LabelSpring>
          </div>

          <Separator className="mx-2 bg-white/10" />

          <ScrollArea className="min-h-0 flex-1">{expanded ? children : null}</ScrollArea>
        </ul>
      </LiquidGlassSurface>
    </SidebarShellFrame>
  );
}
