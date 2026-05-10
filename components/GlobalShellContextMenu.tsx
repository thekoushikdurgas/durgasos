'use client';

import { GlobalUserContextMenuContent } from '@/components/GlobalUserContextMenuContent';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';

type GlobalShellContextMenuProps = {
  children: React.ReactNode;
};

export function GlobalShellContextMenu({ children }: GlobalShellContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <section className="flex min-h-0 w-full flex-1 flex-col outline-none">{children}</section>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-[var(--z-popover)] w-60" collisionPadding={12}>
        <GlobalUserContextMenuContent />
      </ContextMenuContent>
    </ContextMenu>
  );
}
