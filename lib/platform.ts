export type RuntimePlatform =
  | 'web'
  | 'electron-win'
  | 'electron-mac'
  | 'electron-linux'
  | 'android'
  | 'ios';

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside Electron renderer. */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as { electronAPI?: { platform?: string } }).electronAPI);
}

/** True when running in Capacitor native shell (not web browser). */
export function isCapacitorNative(): boolean {
  return Boolean(getCapacitor()?.isNativePlatform?.());
}

/**
 * Detects packaged runtime: Electron desktop, Capacitor Android/iOS, or plain web.
 */
export function detectPlatform(): RuntimePlatform {
  if (typeof window === 'undefined') return 'web';

  const electron = (window as unknown as { electronAPI?: { platform?: NodeJS.Platform } })
    .electronAPI;
  if (electron?.platform) {
    if (electron.platform === 'win32') return 'electron-win';
    if (electron.platform === 'darwin') return 'electron-mac';
    return 'electron-linux';
  }

  const p = getCapacitor()?.getPlatform?.();
  if (p === 'android' || p === 'ios') return p;

  return 'web';
}

export function isMobileRuntime(): boolean {
  const p = detectPlatform();
  return p === 'android' || p === 'ios';
}
