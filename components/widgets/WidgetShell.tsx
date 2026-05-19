'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

type WidgetShellProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
  onConfigure?: () => void;
};

export function WidgetShell({
  title,
  children,
  className,
  onRemove,
  onConfigure,
}: WidgetShellProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn('pointer-events-auto', className)}>
          <LiquidGlassSurface
            variant="liquid"
            contentClassName="min-h-0 bg-slate-950/95"
            className="rounded-2xl border border-white/12 p-3 shadow-[var(--shadow-window-inactive)] backdrop-blur-md"
          >
            {title ? (
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                {title}
              </div>
            ) : null}
            {children}
          </LiquidGlassSurface>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="border-white/10 bg-slate-900/95 text-slate-100">
        {onConfigure ? (
          <ContextMenuItem onClick={onConfigure} className="focus:bg-white/10">
            Configure
          </ContextMenuItem>
        ) : null}
        {onRemove ? (
          <ContextMenuItem onClick={onRemove} className="focus:bg-white/10">
            Remove widget
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
