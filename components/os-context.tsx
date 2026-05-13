'use client';

import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AppId } from '@/lib/apps';
import type { LaunchPayload } from '@/lib/window-launch';

export type DesktopSystemStatus = 'online' | 'degraded' | 'offline';

export interface WindowState {
  id: string;
  appId: AppId;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  launch?: LaunchPayload;
}

interface OSContextType {
  windows: WindowState[];
  activeWindow: string | null;
  isLauncherOpen: boolean;
  isNotifOpen: boolean;
  isCommandPaletteOpen: boolean;
  systemStatus: DesktopSystemStatus;
  openApp: (appId: AppId, launch?: LaunchPayload) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleLauncher: () => void;
  toggleNotifCenter: () => void;
  toggleCommandPalette: () => void;
  setSystemStatus: (s: DesktopSystemStatus) => void;
}

const OSContext = createContext<OSContextType | undefined>(undefined);

let windowIdCounter = 0;

function nextStackZ(prev: WindowState[]) {
  return prev.reduce((m, w) => Math.max(m, w.zIndex), 0) + 1;
}

export function OSProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<DesktopSystemStatus>('online');

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const z = nextStackZ(prev);
      setActiveWindow(id);
      return prev.map((w) => (w.id === id ? { ...w, zIndex: z, isMinimized: false } : w));
    });
  }, []);

  const openApp = useCallback(
    (appId: AppId, launch?: LaunchPayload) => {
      setIsLauncherOpen(false);
      setIsCommandPaletteOpen(false);

      setWindows((prev) => {
        const existingWindow = !launch && prev.find((w) => w.appId === appId);
        if (existingWindow) {
          const z = nextStackZ(prev);
          setActiveWindow(existingWindow.id);
          return prev.map((w) =>
            w.id === existingWindow.id ? { ...w, isMinimized: false, zIndex: z } : w
          );
        }

        windowIdCounter += 1;
        const newId = `${appId}-${windowIdCounter}`;
        const z = nextStackZ(prev);
        setActiveWindow(newId);
        return [
          ...prev,
          {
            id: newId,
            appId,
            isMinimized: false,
            isMaximized: false,
            zIndex: z,
            ...(launch ? { launch } : {}),
          },
        ];
      });
    },
    []
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = prev.filter((w) => w.id !== id);
      setActiveWindow((aw) => {
        if (aw !== id) return aw;
        return next.length ? next[next.length - 1]!.id : null;
      });
      return next;
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    setActiveWindow((aw) => (aw === id ? null : aw));
  }, []);

  const maximizeWindow = useCallback(
    (id: string) => {
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)));
      focusWindow(id);
    },
    [focusWindow]
  );

  const toggleLauncher = () => {
    setIsLauncherOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsNotifOpen(false);
        setIsCommandPaletteOpen(false);
      }
      return next;
    });
  };

  const toggleNotifCenter = () => {
    setIsNotifOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsLauncherOpen(false);
        setIsCommandPaletteOpen(false);
      }
      return next;
    });
  };

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsLauncherOpen(false);
        setIsNotifOpen(false);
      }
      return next;
    });
  }, []);

  return (
    <OSContext.Provider
      value={{
        windows,
        activeWindow,
        isLauncherOpen,
        isNotifOpen,
        isCommandPaletteOpen,
        systemStatus,
        openApp,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        focusWindow,
        toggleLauncher,
        toggleNotifCenter,
        toggleCommandPalette,
        setSystemStatus,
      }}
    >
      {children}
    </OSContext.Provider>
  );
}

export function useOS() {
  const context = useContext(OSContext);
  if (context === undefined) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
}
