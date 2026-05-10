'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppId } from '@/lib/apps';
import type { LaunchPayload } from '@/lib/window-launch';

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
  openApp: (appId: AppId, launch?: LaunchPayload) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleLauncher: () => void;
  toggleNotifCenter: () => void;
}

const OSContext = createContext<OSContextType | undefined>(undefined);

let windowIdCounter = 0;

export function OSProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [maxZ, setMaxZ] = useState(1);

  const openApp = (appId: AppId, launch?: LaunchPayload) => {
    const existingWindow = !launch && windows.find((w) => w.appId === appId);
    if (existingWindow) {
      focusWindow(existingWindow.id);
      if (existingWindow.isMinimized) {
        setWindows((prev) =>
          prev.map((w) => (w.id === existingWindow.id ? { ...w, isMinimized: false } : w))
        );
      }
      setIsLauncherOpen(false);
      return;
    }

    windowIdCounter++;
    const newId = `${appId}-${windowIdCounter}`;
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setWindows([
      ...windows,
      {
        id: newId,
        appId,
        isMinimized: false,
        isMaximized: false,
        zIndex: newZ,
        ...(launch ? { launch } : {}),
      },
    ]);
    setActiveWindow(newId);
    setIsLauncherOpen(false);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter((w) => w.id !== id));
    if (activeWindow === id) {
      // Focus another window if there is one
      const remaining = windows.filter((w) => w.id !== id);
      if (remaining.length > 0) {
        setActiveWindow(remaining[remaining.length - 1].id);
      } else {
        setActiveWindow(null);
      }
    }
  };

  const minimizeWindow = (id: string) => {
    setWindows(windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    if (activeWindow === id) setActiveWindow(null);
  };

  const maximizeWindow = (id: string) => {
    setWindows(windows.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)));
    focusWindow(id);
  };

  const focusWindow = (id: string) => {
    if (activeWindow === id) return;
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setWindows(
      windows.map((w) => {
        if (w.id === id) {
          return { ...w, zIndex: newZ, isMinimized: false };
        }
        return w;
      })
    );
    setActiveWindow(id);
  };

  const toggleLauncher = () => {
    setIsLauncherOpen(!isLauncherOpen);
    if (!isLauncherOpen) setIsNotifOpen(false);
  };

  const toggleNotifCenter = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) setIsLauncherOpen(false);
  };

  return (
    <OSContext.Provider
      value={{
        windows,
        activeWindow,
        isLauncherOpen,
        isNotifOpen,
        openApp,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        focusWindow,
        toggleLauncher,
        toggleNotifCenter,
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
