'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ChevronsUpDown, LayoutGrid, Pin, PinOff, RotateCcw, X, Sliders } from 'lucide-react';

import { LabelSpring, SidebarShellFrame } from '@/components/motion/SidebarShellFrame';
import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { useOS } from '@/components/os-context';
import { cn } from '@/lib/utils';
import { SHELL_Z } from '@/lib/shell-z-index';

function userInitials(email: string | null | undefined, username?: string | null): string {
  if (username?.trim()) return username.trim().slice(0, 2).toUpperCase();
  if (email?.trim()) return email.trim().slice(0, 2).toUpperCase();
  return 'OS';
}

type Props = {
  activeTab: 'catalog' | 'manage';
  onTabChange: (tab: 'catalog' | 'manage') => void;
  onClose: () => void;
  onResetLayout: () => void;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  children: ReactNode;
};

export function WidgetSidebarShell({
  activeTab,
  onTabChange,
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

  const { enabledCount, setEnabledByType } = useWidgetLayout();
  const { isWidgetEditMode } = useOS();

  const effectivePinned = isMobile || pinned;
  const expanded = effectivePinned || hoverExpanded;

  const handleMouseEnter = useCallback(() => {
    if (!effectivePinned) setHoverExpanded(true);
  }, [effectivePinned]);

  const handleMouseLeave = useCallback(() => {
    if (!effectivePinned) setHoverExpanded(false);
  }, [effectivePinned]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isWidgetEditMode) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    [isWidgetEditMode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isWidgetEditMode) return;
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (!type) return;
      setEnabledByType(type as any, false);
    },
    [isWidgetEditMode, setEnabledByType]
  );

  const navRowClass = (tab: 'catalog' | 'manage') =>
    cn(
      'flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-white/10 hover:text-cyan-300',
      activeTab === tab && 'bg-white/15 text-cyan-400'
    );

  return (
    <SidebarShellFrame
      expanded={expanded}
      pinned={effectivePinned}
      reducedMotion={reducedMotion}
      side="left"
      className={cn(
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[9600] max-md:w-full max-md:max-w-sm'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{ zIndex: SHELL_Z.widgetSidebar }}
      widthOpen={350}
      widthClosed={60}
      data-widget-sidebar="true"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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

          <div className="flex w-full flex-col gap-1 p-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'catalog'}
              className={navRowClass('catalog')}
              onClick={() => onTabChange('catalog')}
              title="Widget Catalog"
            >
              <div className="relative flex items-center justify-center">
                <LayoutGrid className="h-4 w-4 shrink-0" />
                {!expanded && enabledCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[8px] font-bold text-black ring-1 ring-black/20">
                    {enabledCount}
                  </span>
                ) : null}
              </div>
              <LabelSpring
                show={expanded}
                reducedMotion={reducedMotion}
                className="flex items-center gap-2"
              >
                <span className="ml-2 text-sm font-medium">Catalog</span>
                {enabledCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="ml-auto h-fit border-none bg-cyan-500/20 px-1.5 text-[10px] text-cyan-300"
                  >
                    {enabledCount}
                  </Badge>
                ) : null}
              </LabelSpring>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'manage'}
              className={navRowClass('manage')}
              onClick={() => onTabChange('manage')}
              title="Manage Widgets"
            >
              <div className="relative flex items-center justify-center">
                <Sliders className="h-4 w-4 shrink-0" />
                {!expanded && isWidgetEditMode ? (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                ) : null}
              </div>
              <LabelSpring
                show={expanded}
                reducedMotion={reducedMotion}
                className="flex items-center gap-2"
              >
                <span className="ml-2 text-sm font-medium">Manage</span>
                {isWidgetEditMode ? (
                  <span className="ml-auto flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                  </span>
                ) : null}
              </LabelSpring>
            </button>
          </div>

          <Separator className="mx-2 bg-white/10" />

          <ScrollArea className="min-h-0 flex-1">{expanded ? children : null}</ScrollArea>
        </ul>
      </LiquidGlassSurface>
    </SidebarShellFrame>
  );
}
