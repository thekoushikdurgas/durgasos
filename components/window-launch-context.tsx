'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { LaunchPayload } from '@/lib/window-launch';

const WindowLaunchContext = createContext<LaunchPayload | undefined>(undefined);

export function WindowLaunchProvider({
  value,
  children,
}: {
  value: LaunchPayload | undefined;
  children: ReactNode;
}) {
  return <WindowLaunchContext.Provider value={value}>{children}</WindowLaunchContext.Provider>;
}

export function useWindowLaunch(): LaunchPayload | undefined {
  return useContext(WindowLaunchContext);
}
