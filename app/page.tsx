'use client';

import { GlobalShellContextMenu } from '@/components/GlobalShellContextMenu';
import { OSProvider, useOS } from '@/components/os-context';
import { TopBar } from '@/components/TopBar';
import { Dock } from '@/components/Dock';
import { Launcher } from '@/components/Launcher';
import { NotificationCenter } from '@/components/NotificationCenter';
import { WindowManager } from '@/components/WindowManager';
import { DesktopWidgets } from '@/components/DesktopWidgets';
import React, { use } from 'react';

// Wrapper to handle global desktop clicks
function DesktopInteractionManager({ children }: { children: React.ReactNode }) {
  const {
    isLauncherOpen,
    isNotifOpen,
    toggleLauncher,
    toggleNotifCenter,
    activeWindow,
    focusWindow,
  } = useOS();

  const handleDesktopClick = () => {
    if (isLauncherOpen) toggleLauncher();
    if (isNotifOpen) toggleNotifCenter();
    if (activeWindow) {
      // Find a way to unfocus if clicking empty desktop?
      // For now, leaving activeWindow as-is is fine, but maybe unfocus windows so topbar updates?
      // Not implemented in context, so we just close menus.
    }
  };

  return (
    <div className="relative h-full w-full" onClick={handleDesktopClick}>
      {children}
    </div>
  );
}

type HomePageProps = {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function Home({ params, searchParams }: HomePageProps) {
  // Next.js 15+: these are Promises; unwrap before any implicit enumeration (e.g. devtools).
  use(params);
  use(searchParams);

  return (
    <main className="relative flex h-screen min-h-[100dvh] w-full flex-col overflow-hidden bg-transparent font-sans text-slate-200">
      <OSProvider>
        <GlobalShellContextMenu>
          {/* Top Global Menu Bar */}
          <div className="relative z-[100] w-full shrink-0">
            <TopBar />
          </div>

          {/* Desktop Area */}
          <div className="relative z-10 flex h-full min-h-0 w-full flex-1">
            <DesktopInteractionManager>
              {/* Widgets Layer (Background) */}
              <DesktopWidgets />

              {/* Windows Layer */}
              <WindowManager />

              {/* Overlays */}
              <Launcher />
              <NotificationCenter />
            </DesktopInteractionManager>
          </div>

          {/* Bottom Dock/Taskbar */}
          <div className="relative z-50 shrink-0">
            <Dock />
          </div>

          {/* Bottom Taskbar Stats (Linux flair) */}
          <div className="pointer-events-none absolute bottom-0 z-50 h-1 w-full bg-gradient-to-r from-cyan-500 via-transparent to-purple-500 opacity-40"></div>
        </GlobalShellContextMenu>
      </OSProvider>
    </main>
  );
}
