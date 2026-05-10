export const DESKTOP_BACKGROUND_IDS = ['stars', 'classic', 'paths', 'asmr'] as const;

export type DesktopBackgroundId = (typeof DESKTOP_BACKGROUND_IDS)[number];

export const DEFAULT_DESKTOP_BACKGROUND_ID: DesktopBackgroundId = 'stars';

export const DESKTOP_BACKGROUND_STORAGE_KEY = 'durgasos.desktopBackground';

export function isDesktopBackgroundId(value: string): value is DesktopBackgroundId {
  return (DESKTOP_BACKGROUND_IDS as readonly string[]).includes(value);
}

export function parseStoredDesktopBackground(raw: string | null): DesktopBackgroundId | null {
  if (raw == null || raw === '') return null;
  return isDesktopBackgroundId(raw) ? raw : null;
}

const desktopBackgroundListeners = new Set<() => void>();

/** Same-tab + cross-tab updates for `useSyncExternalStore` (localStorage). */
export function subscribeDesktopBackground(onStoreChange: () => void): () => void {
  desktopBackgroundListeners.add(onStoreChange);
  if (typeof window === 'undefined') {
    return () => {
      desktopBackgroundListeners.delete(onStoreChange);
    };
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === DESKTOP_BACKGROUND_STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    desktopBackgroundListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function notifyDesktopBackgroundListeners(): void {
  desktopBackgroundListeners.forEach((fn) => {
    fn();
  });
}

export function getDesktopBackgroundSnapshot(): DesktopBackgroundId {
  if (typeof window === 'undefined') {
    return DEFAULT_DESKTOP_BACKGROUND_ID;
  }
  return (
    parseStoredDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_STORAGE_KEY)) ??
    DEFAULT_DESKTOP_BACKGROUND_ID
  );
}

export const DESKTOP_BACKGROUND_OPTIONS: ReadonlyArray<{
  id: DesktopBackgroundId;
  title: string;
  description: string;
}> = [
  {
    id: 'stars',
    title: 'Stars',
    description: 'Deep space starfield with subtle motion.',
  },
  {
    id: 'classic',
    title: 'Classic',
    description: 'Gradient, liquid image scroll, and soft vignette.',
  },
  {
    id: 'paths',
    title: 'Flow paths',
    description: 'Curved line animation behind the desktop.',
  },
  {
    id: 'asmr',
    title: 'Particles',
    description: 'Fine shards with gentle motion (interactive near the cursor).',
  },
];
