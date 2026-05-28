'use client';

import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';
import { useOS } from '@/components/os-context';
import { cn } from '@/lib/utils';

export function QuickActionsWidget() {
  const { toggleLauncher, openApp } = useOS();

  return (
    <DesktopWidgetChrome maxWidthClass="max-w-[min(100vw-2rem,240px)]">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            'rounded-lg border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
            'transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/30'
          )}
          onClick={toggleLauncher}
        >
          Launcher
        </button>
        <button
          type="button"
          className={cn(
            'rounded-lg border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
            'transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/30'
          )}
          onClick={() => openApp('workflow')}
        >
          Workflows
        </button>
      </div>
    </DesktopWidgetChrome>
  );
}
