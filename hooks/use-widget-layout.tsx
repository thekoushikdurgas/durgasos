'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchBackendGraphql } from '@/lib/backend-http';
import {
  createDefaultLayout,
  getWidgetDefinition,
  nextWidgetId,
  type WidgetLayoutItem,
  type WidgetPosition,
  type WidgetType,
} from '@/lib/widget-registry';
import { MAX_DESKTOP_WIDGET_Z_INDEX } from '@/lib/shell-z-index';
import { clampPositionOnCanvas, normalizeLayoutPayload } from '@/lib/widget-layout-utils';

export type { WidgetLayoutItem, WidgetType } from '@/lib/widget-registry';

const STORAGE_KEY_V2 = 'durgasos_widgets_layout_v2';
const STORAGE_KEY_V1 = 'durgasos_widgets_layout_v1';
const LAYOUT_CHANGED = 'durgasos:widget-layout-changed';

let serverHydrated = false;
let pushCancel: (() => void) | null = null;

function readLayoutFromStorage(): WidgetLayoutItem[] {
  if (typeof window === 'undefined') {
    return createDefaultLayout();
  }
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) {
      const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
      if (v1) {
        const migrated = normalizeLayoutPayload(JSON.parse(v1) as unknown);
        const json = JSON.stringify(migrated);
        window.localStorage.setItem(STORAGE_KEY_V2, json);
        raw = json;
      }
    }
    const json = raw ?? JSON.stringify(createDefaultLayout());
    return normalizeLayoutPayload(JSON.parse(json) as unknown);
  } catch {
    return createDefaultLayout();
  }
}

function notifyLayoutChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LAYOUT_CHANGED));
}

async function pullWidgetLayoutFromServer(): Promise<WidgetLayoutItem[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const r = await fetchBackendGraphql({
      query: `
      query WidgetLayout {
        widgetLayout {
          id
          ownerId
          layoutJson
          updatedAt
        }
      }
    `,
    });
    if (!r.ok) return null;
    const json = (await r.json()) as {
      data?: { widgetLayout?: { layoutJson?: unknown } | null };
    };
    const layout = json.data?.widgetLayout?.layoutJson;
    const hasLocalV2 = Boolean(window.localStorage.getItem(STORAGE_KEY_V2));
    if (Array.isArray(layout) && layout.length > 0 && !hasLocalV2) {
      const normalized = normalizeLayoutPayload(layout);
      try {
        window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(normalized));
      } catch {
        /* quota */
      }
      notifyLayoutChanged();
      return normalized;
    }
  } catch {
    /* offline */
  }
  return null;
}

function pushWidgetLayoutToServer(layout: WidgetLayoutItem[]): void {
  if (typeof window === 'undefined') return;
  void fetchBackendGraphql({
    query: `
      mutation SaveWidgetLayout($layoutJson: JSON!) {
        saveWidgetLayout(layoutJson: $layoutJson) {
          id
          ownerId
          layoutJson
          updatedAt
        }
      }
    `,
    variables: { layoutJson: layout },
  }).catch(() => {
    /* offline */
  });
}

function schedulePushToServer(layout: WidgetLayoutItem[], delayMs = 300): void {
  if (typeof window === 'undefined') return;
  pushCancel?.();
  const t = window.setTimeout(() => pushWidgetLayoutToServer(layout), delayMs);
  pushCancel = () => window.clearTimeout(t);
}

type WidgetLayoutContextValue = {
  items: WidgetLayoutItem[];
  enabledCount: number;
  setItems: (updater: (prev: WidgetLayoutItem[]) => WidgetLayoutItem[]) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  setEnabledByType: (type: WidgetType, enabled: boolean) => void;
  updatePosition: (id: string, position: WidgetPosition) => void;
  bringToFront: (id: string) => void;
  removeWidget: (id: string) => void;
  resetLayout: () => void;
};

const WidgetLayoutContext = createContext<WidgetLayoutContextValue | null>(null);

export function WidgetLayoutProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WidgetLayoutItem[]>(createDefaultLayout);

  const persist = useCallback((updater: (prev: WidgetLayoutItem[]) => WidgetLayoutItem[]) => {
    setItems((prev) => {
      const next = normalizeLayoutPayload(updater(prev));
      try {
        window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next));
      } catch {
        /* quota */
      }
      schedulePushToServer(next);
      return next;
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(readLayoutFromStorage());
    });

    const syncFromStorage = () => {
      setItems(readLayoutFromStorage());
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY_V2 || e.key === STORAGE_KEY_V1) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LAYOUT_CHANGED, syncFromStorage);

    if (!serverHydrated) {
      serverHydrated = true;
      void pullWidgetLayoutFromServer().then((fromServer) => {
        if (fromServer) setItems(fromServer);
      });
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LAYOUT_CHANGED, syncFromStorage);
    };
  }, []);

  const setEnabledByType = useCallback(
    (type: WidgetType, enabled: boolean) => {
      persist((prev) => {
        const idx = prev.findIndex((w) => w.type === type);
        if (idx >= 0) {
          return prev.map((w, i) => (i === idx ? { ...w, enabled } : w));
        }
        const def = getWidgetDefinition(type);
        return [
          ...prev,
          {
            id: nextWidgetId(type),
            type,
            enabled,
            position: { ...def.defaultPosition },
            zIndex: def.defaultZIndex,
          },
        ];
      });
    },
    [persist]
  );

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      persist((p) => p.map((w) => (w.id === id ? { ...w, enabled } : w)));
    },
    [persist]
  );

  const updatePosition = useCallback(
    (id: string, position: WidgetPosition) => {
      const clamped = clampPositionOnCanvas(position);
      persist((p) => p.map((w) => (w.id === id ? { ...w, position: clamped } : w)));
    },
    [persist]
  );

  const bringToFront = useCallback(
    (id: string) => {
      persist((p) => {
        const maxZ = p.reduce((m, w) => Math.max(m, w.zIndex ?? 1), 1);
        const nextZ = Math.min(maxZ + 1, MAX_DESKTOP_WIDGET_Z_INDEX);
        return p.map((w) => (w.id === id ? { ...w, zIndex: nextZ } : w));
      });
    },
    [persist]
  );

  const removeWidget = useCallback(
    (id: string) => {
      persist((p) => p.map((w) => (w.id === id ? { ...w, enabled: false } : w)));
    },
    [persist]
  );

  const resetLayout = useCallback(() => {
    persist(() => createDefaultLayout());
  }, [persist]);

  const enabledCount = items.filter((w) => w.enabled).length;

  const value = useMemo(
    () => ({
      items,
      enabledCount,
      setItems: persist,
      setEnabled,
      setEnabledByType,
      updatePosition,
      bringToFront,
      removeWidget,
      resetLayout,
    }),
    [
      items,
      enabledCount,
      persist,
      setEnabled,
      setEnabledByType,
      updatePosition,
      bringToFront,
      removeWidget,
      resetLayout,
    ]
  );

  return <WidgetLayoutContext.Provider value={value}>{children}</WidgetLayoutContext.Provider>;
}

export function useWidgetLayout() {
  const ctx = useContext(WidgetLayoutContext);
  if (!ctx) {
    throw new Error('useWidgetLayout must be used within WidgetLayoutProvider');
  }
  return ctx;
}
