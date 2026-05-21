import type { AppId } from '@/lib/apps';
import type { LaunchPayload } from '@/lib/window-launch';

export const OS_WINDOWS_STORAGE_KEY = 'durgasos_os_windows_v1';

export type PersistedOSWindow = {
  appId: AppId;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
};

export type WindowLike = {
  appId: AppId;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  launch?: LaunchPayload;
};

export function hasEphemeralLaunch(launch?: LaunchPayload): boolean {
  if (!launch) return false;
  return Boolean(
    launch.pathSegments?.length ||
    launch.fileName ||
    launch.initialUrl ||
    launch.storage ||
    launch.voidIdeStorageFolder?.folder_path
  );
}

export function readPersistedWindows(): PersistedOSWindow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OS_WINDOWS_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(
      (row): row is PersistedOSWindow =>
        row && typeof row === 'object' && typeof (row as PersistedOSWindow).appId === 'string'
    ) as PersistedOSWindow[];
  } catch {
    return [];
  }
}

export function serializeWindowsForPersist(windows: WindowLike[]): PersistedOSWindow[] {
  return windows
    .filter((w) => !hasEphemeralLaunch(w.launch))
    .map((w) => ({
      appId: w.appId,
      isMinimized: w.isMinimized,
      isMaximized: w.isMaximized,
      zIndex: w.zIndex,
    }));
}

export function schedulePersistWindows(windows: WindowLike[], delayMs = 300): () => void {
  if (typeof window === 'undefined') return () => {};
  const t = window.setTimeout(() => {
    try {
      const payload = serializeWindowsForPersist(windows);
      window.localStorage.setItem(OS_WINDOWS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota */
    }
  }, delayMs);
  return () => window.clearTimeout(t);
}
