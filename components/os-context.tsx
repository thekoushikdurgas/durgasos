'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from 'react';
import { APPS, AppId } from '@/lib/apps';
import { dispatchOsLog } from '@/lib/notifications';
import { readPersistedWindows, schedulePersistWindows } from '@/lib/os-windows-persist';
import type { LaunchPayload } from '@/lib/window-launch';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { clampWindowZIndex, MAX_WINDOW_Z_INDEX, SHELL_Z } from '@/lib/shell-z-index';

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
  launchingApps: Record<AppId, boolean>;
  isLauncherOpen: boolean;
  isNotifOpen: boolean;
  isCommandPaletteOpen: boolean;
  isWidgetSidebarOpen: boolean;
  isWidgetEditMode: boolean;
  systemStatus: DesktopSystemStatus;
  openApp: (appId: AppId, launch?: LaunchPayload) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleLauncher: () => void;
  openLauncher: () => void;
  closeLauncher: (reason?: string) => void;
  toggleNotifCenter: () => void;
  toggleCommandPalette: () => void;
  toggleWidgetSidebar: () => void;
  setWidgetEditMode: (on: boolean) => void;
  setSystemStatus: (s: DesktopSystemStatus) => void;
}

const OSContext = createContext<OSContextType | undefined>(undefined);

let windowIdCounter = 0;

function nextStackZ(prev: WindowState[]) {
  const top = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
  return clampWindowZIndex(top + 1);
}

function normalizeWindowStack(prev: WindowState[]): WindowState[] {
  if (!prev.some((w) => w.zIndex > MAX_WINDOW_Z_INDEX)) return prev;
  return prev.map((w) => ({ ...w, zIndex: clampWindowZIndex(w.zIndex) }));
}

export function OSProvider({ children }: { children: ReactNode }) {
  const { isInstalled, ready } = useInstalledApps();
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const restoredRef = useRef(false);
  const persistCancelRef = useRef<(() => void) | null>(null);
  const [launchingApps, setLaunchingApps] = useState<Record<AppId, boolean>>(
    {} as Record<AppId, boolean>
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !ready || restoredRef.current) return;
    restoredRef.current = true;
    const rows = readPersistedWindows().filter((r) => isInstalled(r.appId as AppId));
    if (!rows.length) return;
    const base = Date.now();
    const next: WindowState[] = rows.map((r, idx) => ({
      id: `${r.appId}-restored-${base}-${idx}`,
      appId: r.appId as AppId,
      isMinimized: r.isMinimized,
      isMaximized: r.isMaximized,
      zIndex: clampWindowZIndex(Math.max(1, r.zIndex) + idx),
    }));
    windowIdCounter += next.length;
    startTransition(() => {
      setWindows(normalizeWindowStack(next));
      setActiveWindow(next[next.length - 1]?.id ?? null);
    });
  }, [ready, isInstalled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistCancelRef.current?.();
    persistCancelRef.current = schedulePersistWindows(windows, 300);
    return () => {
      persistCancelRef.current?.();
    };
  }, [windows]);

  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWidgetSidebarOpen, setIsWidgetSidebarOpen] = useState(false);
  const [isWidgetEditMode, setIsWidgetEditMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState<DesktopSystemStatus>('online');

  const focusWindow = useCallback(
    (id: string) => {
      const z = nextStackZ(windows);
      setActiveWindow(id);
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, zIndex: z, isMinimized: false } : w))
      );
    },
    [windows]
  );

  const openApp = useCallback(
    (appId: AppId, launch?: LaunchPayload) => {
      if (!launch?.bypassInstallCheck && !isInstalled(appId)) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('durgasos-notice', {
              detail: {
                message: `“${APPS[appId]?.name ?? appId}” is not installed. Open Apps to install it.`,
              },
            })
          );
        }
        return;
      }

      setIsLauncherOpen(false);
      setIsCommandPaletteOpen(false);

      const hasContentPayload = Boolean(
        launch &&
        (launch.pathSegments?.length ||
          launch.fileName ||
          launch.initialUrl ||
          launch.storage ||
          launch.voidIdeStorageFolder?.folder_path)
      );
      const persistLaunch =
        launch && (hasContentPayload || launch.settingsTab) ? launch : undefined;
      const reuseWindow = !hasContentPayload;

      const existingWindow = reuseWindow && windows.find((w) => w.appId === appId);
      if (existingWindow) {
        const z = nextStackZ(windows);
        setActiveWindow(existingWindow.id);
        setWindows((prev) =>
          prev.map((w) =>
            w.id === existingWindow.id
              ? {
                  ...w,
                  isMinimized: false,
                  zIndex: z,
                  launch:
                    appId === 'settings' && launch?.settingsTab
                      ? { ...w.launch, settingsTab: launch.settingsTab }
                      : w.launch,
                }
              : w
          )
        );
        return;
      }

      if (launchingApps[appId]) {
        return;
      }

      setLaunchingApps((prev) => ({ ...prev, [appId]: true }));

      setTimeout(() => {
        setLaunchingApps((prev) => {
          const next = { ...prev };
          delete next[appId];
          return next;
        });

        dispatchOsLog({
          category: 'app',
          message: `Opened ${APPS[appId]?.name ?? appId}`,
          level: 'info',
          meta: { appId },
        });

        setWindows((prev) => {
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
              ...(persistLaunch ? { launch: persistLaunch } : {}),
            },
          ];
        });
      }, 1000);
    },
    [isInstalled, windows, launchingApps]
  );

  const closeWindow = useCallback(
    (id: string) => {
      const closing = windows.find((w) => w.id === id);
      if (closing) {
        dispatchOsLog({
          category: 'app',
          message: `Closed ${APPS[closing.appId]?.name ?? closing.appId}`,
          level: 'info',
          meta: { appId: closing.appId, windowId: id },
        });
      }
      const next = windows.filter((w) => w.id !== id);
      setWindows(next);
      setActiveWindow((aw) => {
        if (aw !== id) return aw;
        return next.length ? next[next.length - 1]!.id : null;
      });
    },
    [windows]
  );

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    setActiveWindow((aw) => (aw === id ? null : aw));
  }, []);

  const maximizeWindow = useCallback(
    (id: string) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
      );
      focusWindow(id);
    },
    [focusWindow]
  );

  const closeOtherShellOverlays = useCallback(() => {
    setIsNotifOpen(false);
    setIsCommandPaletteOpen(false);
    setIsWidgetSidebarOpen(false);
  }, []);

  const openLauncher = useCallback(() => {
    closeOtherShellOverlays();
    setIsLauncherOpen(true);
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f051be' },
        body: JSON.stringify({
          sessionId: 'f051be',
          hypothesisId: 'H-L4',
          location: 'os-context.tsx:openLauncher',
          message: 'Launcher opened',
          data: {
            maxWindowZ: windows.reduce((m, w) => Math.max(m, w.zIndex), 0),
            shellPanelZ: SHELL_Z.launcherPanel,
          },
          timestamp: Date.now(),
          runId: 'post-fix-v3',
        }),
      }).catch(() => {});
    }
    // #endregion
  }, [closeOtherShellOverlays, windows]);

  const closeLauncher = useCallback((reason = 'unknown') => {
    setIsLauncherOpen(false);
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f051be' },
        body: JSON.stringify({
          sessionId: 'f051be',
          hypothesisId: 'H-L5',
          location: 'os-context.tsx:closeLauncher',
          message: 'Launcher closed',
          data: { reason },
          timestamp: Date.now(),
          runId: 'post-fix-v4',
        }),
      }).catch(() => {});
    }
    // #endregion
  }, []);

  const toggleLauncher = useCallback(() => {
    setIsLauncherOpen((prev) => {
      const next = !prev;
      if (next) closeOtherShellOverlays();
      return next;
    });
  }, [closeOtherShellOverlays]);

  const toggleNotifCenter = () => {
    setIsNotifOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsLauncherOpen(false);
        setIsCommandPaletteOpen(false);
        setIsWidgetSidebarOpen(false);
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
        setIsWidgetSidebarOpen(false);
      }
      return next;
    });
  }, []);

  const toggleWidgetSidebar = useCallback(() => {
    setIsWidgetSidebarOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsLauncherOpen(false);
        setIsNotifOpen(false);
        setIsCommandPaletteOpen(false);
      } else {
        setIsWidgetEditMode(false);
      }
      return next;
    });
  }, []);

  const setWidgetEditMode = useCallback((on: boolean) => {
    setIsWidgetEditMode(on);
  }, []);

  return (
    <OSContext.Provider
      value={{
        windows,
        activeWindow,
        launchingApps,
        isLauncherOpen,
        isNotifOpen,
        isCommandPaletteOpen,
        isWidgetSidebarOpen,
        isWidgetEditMode,
        systemStatus,
        openApp,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        focusWindow,
        toggleLauncher,
        openLauncher,
        closeLauncher,
        toggleNotifCenter,
        toggleCommandPalette,
        toggleWidgetSidebar,
        setWidgetEditMode,
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
