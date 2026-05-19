'use client';

import { GlobalShellContextMenu } from '@/components/GlobalShellContextMenu';
import { OSProvider, useOS } from '@/components/os-context';
import { InstalledAppsProvider } from '@/hooks/use-installed-apps';
import { TopBar } from '@/components/TopBar';
import { Dock } from '@/components/Dock';
import { Launcher } from '@/components/Launcher';
import { NotificationCenter } from '@/components/NotificationCenter';
import { WindowManager } from '@/components/WindowManager';
import { DesktopAiSearchBar } from '@/components/DesktopAiSearchBar';
import { DesktopWidgets } from '@/components/DesktopWidgets';
import { CommandPalette } from '@/components/CommandPalette';
import { SystemStatusBridge } from '@/components/SystemStatusIcons';
import { DesktopNoticeHost } from '@/components/DesktopNoticeHost';
import React, { use } from 'react';

// Wrapper to handle global desktop clicks
function DesktopInteractionManager({ children }: { children: React.ReactNode }) {
  const {
    isLauncherOpen,
    isNotifOpen,
    isCommandPaletteOpen,
    toggleLauncher,
    toggleNotifCenter,
    toggleCommandPalette,
  } = useOS();

  const handleDesktopClick = () => {
    if (isLauncherOpen) toggleLauncher();
    if (isNotifOpen) toggleNotifCenter();
    if (isCommandPaletteOpen) toggleCommandPalette();
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
    <main
      id="main-content"
      className="relative flex h-screen min-h-[100dvh] w-full flex-col overflow-hidden bg-transparent font-sans text-slate-200"
    >
      <InstalledAppsProvider>
        <OSProvider>
          <SystemStatusBridge />
          <DesktopNoticeHost />
          <GlobalShellContextMenu>
            <header className="relative z-[100] w-full shrink-0">
              <TopBar />
            </header>

            <div className="relative z-10 flex h-full min-h-0 w-full flex-1">
              <DesktopInteractionManager>
                <DesktopWidgets />

                <DesktopAiSearchBar />

                <WindowManager />

                <Launcher />
                <NotificationCenter />
                <CommandPalette />
              </DesktopInteractionManager>
            </div>

            <Dock />

            <div className="pointer-events-none absolute bottom-0 z-[94] h-1 w-full bg-gradient-to-r from-cyan-500 via-transparent to-purple-500 opacity-40" />
          </GlobalShellContextMenu>
        </OSProvider>
      </InstalledAppsProvider>
    </main>
  );
}
