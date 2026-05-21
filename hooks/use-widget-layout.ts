'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { fetchBackendGraphql } from '@/lib/backend-http';
import {
  createDefaultLayout,
  getWidgetDefinition,
  nextWidgetId,
  type WidgetLayoutItem,
  type WidgetPosition,
  type WidgetType,
} from '@/lib/widget-registry';
import { clampPositionOnCanvas, normalizeLayoutPayload } from '@/lib/widget-layout-utils';

export type { WidgetLayoutItem, WidgetType } from '@/lib/widget-registry';

const STORAGE_KEY_V2 = 'durgasos_widgets_layout_v2';
const STORAGE_KEY_V1 = 'durgasos_widgets_layout_v1';
const LAYOUT_CHANGED = 'durgasos:widget-layout-changed';

/** Stable reference for useSyncExternalStore server snapshot (must not allocate per call). */
const SERVER_SNAPSHOT: WidgetLayoutItem[] = createDefaultLayout();

let snapshotJson = '';
let snapshotItems: WidgetLayoutItem[] = SERVER_SNAPSHOT;
let serverHydrated = false;
let pushCancel: (() => void) | null = null;

function invalidateSnapshotCache() {
  snapshotJson = '';
}

function readLayoutFromStorage(): { json: string; items: WidgetLayoutItem[] } {
  if (typeof window === 'undefined') {
    return { json: '', items: createDefaultLayout() };
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
    const parsed = JSON.parse(json) as unknown;
    const items = normalizeLayoutPayload(parsed);
    return { json, items };
  } catch {
    return { json: JSON.stringify(createDefaultLayout()), items: createDefaultLayout() };
  }
}

function getSnapshot(): WidgetLayoutItem[] {
  const { json, items } = readLayoutFromStorage();
  if (json === snapshotJson) return snapshotItems;
  snapshotJson = json;
  snapshotItems = items;
  return snapshotItems;
}

function getServerSnapshot(): WidgetLayoutItem[] {
  return SERVER_SNAPSHOT;
}

function notifyLayoutChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LAYOUT_CHANGED));
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY_V2 || e.key === STORAGE_KEY_V1) {
      invalidateSnapshotCache();
      onStoreChange();
    }
  };
  const onLocal = () => {
    invalidateSnapshotCache();
    onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(LAYOUT_CHANGED, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LAYOUT_CHANGED, onLocal);
  };
}

async function pullWidgetLayoutFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
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
    if (!r.ok) return;
    const json = (await r.json()) as {
      data?: { widgetLayout?: { layoutJson?: unknown } | null };
    };
    const layout = json.data?.widgetLayout?.layoutJson;
    if (Array.isArray(layout) && layout.length > 0) {
      const normalized = normalizeLayoutPayload(layout);
      window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(normalized));
      invalidateSnapshotCache();
      notifyLayoutChanged();
    }
  } catch {
    /* offline */
  }
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
  pushCancel?.();
  pushCancel = () => {
    if (typeof window !== 'undefined') window.clearTimeout(t);
  };
  if (typeof window === 'undefined') return;
  const t = window.setTimeout(() => pushWidgetLayoutToServer(layout), delayMs);
  const prevCancel = pushCancel;
  pushCancel = () => {
    prevCancel();
    window.clearTimeout(t);
  };
}

export function useWidgetLayout() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (serverHydrated) return;
    serverHydrated = true;
    void pullWidgetLayoutFromServer();
  }, []);

  const persist = useCallback((updater: (prev: WidgetLayoutItem[]) => WidgetLayoutItem[]) => {
    const prev = getSnapshot();
    const next = normalizeLayoutPayload(updater(prev));
    try {
      window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next));
    } catch {
      /* quota */
    }
    invalidateSnapshotCache();
    notifyLayoutChanged();
    schedulePushToServer(next);
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
        return p.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
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

  return {
    items,
    enabledCount,
    setItems: persist,
    setEnabled,
    setEnabledByType,
    updatePosition,
    bringToFront,
    removeWidget,
    resetLayout,
  };
}
