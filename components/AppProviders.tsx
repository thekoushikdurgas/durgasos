'use client';

import { BackgroundSyncHost } from '@/components/BackgroundSyncHost';
import { DesktopBackgroundLayer } from '@/components/desktop-background/DesktopBackgroundLayer';
import { DesktopBackgroundProvider } from '@/components/desktop-background/DesktopBackgroundProvider';
import { ThemePreferencesProvider } from '@/components/ThemePreferences';
import { NativePlatformBridge } from '@/components/NativePlatformBridge';
import type { ReactNode } from 'react';

/** Global theme prefs, persisted desktop background, and full-viewport background layer for all routes. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemePreferencesProvider>
      <BackgroundSyncHost />
      <NativePlatformBridge />
      <DesktopBackgroundProvider>
        <DesktopBackgroundLayer />
        <div className="relative isolate z-10 min-h-[100dvh]">{children}</div>
      </DesktopBackgroundProvider>
    </ThemePreferencesProvider>
  );
}
