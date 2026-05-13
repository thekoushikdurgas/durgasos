'use client';

import { useCallback, useEffect, useState } from 'react';

export type WidgetLayoutItem = {
  id: string;
  type: 'clock' | 'weather' | 'agent_status' | 'system_feed' | 'quick_actions';
  enabled: boolean;
  column?: number;
};

const STORAGE_KEY = 'durgasos_widgets_layout_v1';

const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: 'clock-1', type: 'clock', enabled: true, column: 2 },
  { id: 'weather-1', type: 'weather', enabled: true, column: 2 },
  { id: 'agent-1', type: 'agent_status', enabled: false, column: 2 },
  { id: 'feed-1', type: 'system_feed', enabled: false, column: 2 },
  { id: 'quick-1', type: 'quick_actions', enabled: false, column: 2 },
];

function loadLayout(): WidgetLayoutItem[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;
    return parsed as WidgetLayoutItem[];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function useWidgetLayout() {
  const [items, setItems] = useState<WidgetLayoutItem[]>(DEFAULT_LAYOUT);

  useEffect(() => {
    setItems(loadLayout());
  }, []);

  const persist = useCallback((updater: (prev: WidgetLayoutItem[]) => WidgetLayoutItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota */
      }
      return next;
    });
  }, []);

  const setEnabled = useCallback((id: string, enabled: boolean) => {
    persist((prev) => prev.map((w) => (w.id === id ? { ...w, enabled } : w)));
  }, [persist]);

  const removeWidget = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((w) => w.id !== id));
    },
    [persist]
  );

  const resetLayout = useCallback(() => {
    persist(() => [...DEFAULT_LAYOUT]);
  }, [persist]);

  return { items, setItems: persist, setEnabled, removeWidget, resetLayout };
}
