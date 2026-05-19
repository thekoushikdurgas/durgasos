'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { fetchBackendGraphql } from '@/lib/backend-http';

export type WidgetLayoutItem = {
  id: string;
  type: 'clock' | 'weather' | 'agent_status' | 'system_feed' | 'quick_actions';
  enabled: boolean;
  column?: number;
};

const STORAGE_KEY = 'durgasos_widgets_layout_v1';
const LAYOUT_CHANGED = 'durgasos:widget-layout-changed';

const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: 'clock-1', type: 'clock', enabled: true, column: 2 },
  { id: 'weather-1', type: 'weather', enabled: true, column: 2 },
  { id: 'agent-1', type: 'agent_status', enabled: false, column: 2 },
  { id: 'feed-1', type: 'system_feed', enabled: false, column: 2 },
  { id: 'quick-1', type: 'quick_actions', enabled: false, column: 2 },
];

let snapshotJson = '';
let snapshotItems: WidgetLayoutItem[] = DEFAULT_LAYOUT;

let serverHydrated = false;

function invalidateSnapshotCache() {
  snapshotJson = '';
}

function readLayoutFromStorage(): { json: string; items: WidgetLayoutItem[] } {
  if (typeof window === 'undefined') {
    return { json: '', items: DEFAULT_LAYOUT };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const json = raw ?? JSON.stringify(DEFAULT_LAYOUT);
    const parsed = JSON.parse(json) as unknown;
    const items = Array.isArray(parsed) ? (parsed as WidgetLayoutItem[]) : DEFAULT_LAYOUT;
    return { json, items };
  } catch {
    return { json: JSON.stringify(DEFAULT_LAYOUT), items: DEFAULT_LAYOUT };
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
  return DEFAULT_LAYOUT;
}

function notifyLayoutChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LAYOUT_CHANGED));
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) {
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
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

export function useWidgetLayout() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (serverHydrated) return;
    serverHydrated = true;
    void pullWidgetLayoutFromServer();
  }, []);

  const persist = useCallback((updater: (prev: WidgetLayoutItem[]) => WidgetLayoutItem[]) => {
    const prev = getSnapshot();
    const next = updater(prev);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
    invalidateSnapshotCache();
    notifyLayoutChanged();
    pushWidgetLayoutToServer(next);
  }, []);

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      persist((p) => p.map((w) => (w.id === id ? { ...w, enabled } : w)));
    },
    [persist]
  );

  const removeWidget = useCallback(
    (id: string) => {
      persist((p) => p.filter((w) => w.id !== id));
    },
    [persist]
  );

  const resetLayout = useCallback(() => {
    persist(() => [...DEFAULT_LAYOUT]);
  }, [persist]);

  return { items, setItems: persist, setEnabled, removeWidget, resetLayout };
}
