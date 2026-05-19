'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { WindowLaunchContextValue } from '@/lib/window-launch';

const WindowLaunchContext = createContext<WindowLaunchContextValue | undefined>(undefined);

export function WindowLaunchProvider({
  value,
  children,
}: {
  value: WindowLaunchContextValue;
  children: ReactNode;
}) {
  return <WindowLaunchContext.Provider value={value}>{children}</WindowLaunchContext.Provider>;
}

export function useWindowLaunch(): WindowLaunchContextValue | undefined {
  return useContext(WindowLaunchContext);
}
