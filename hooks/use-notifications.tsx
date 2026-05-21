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

import {
  LEGACY_NOTICE_EVENT,
  OS_NOTIFICATION_EVENT,
  type OsNotification,
} from '@/lib/notifications';

const STORAGE_KEY = 'durgasos_notifications_v1';
const MAX_NOTIFICATIONS = 100;
const PERSIST_COUNT = 50;

function readPersisted(): OsNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is OsNotification =>
        n &&
        typeof n === 'object' &&
        typeof (n as OsNotification).id === 'string' &&
        typeof (n as OsNotification).title === 'string'
    ) as OsNotification[];
  } catch {
    return [];
  }
}

function writePersisted(list: OsNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, PERSIST_COUNT)));
  } catch {
    /* quota */
  }
}

export type NotificationsContextValue = {
  notifications: OsNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<OsNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setNotifications(readPersisted());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted(notifications);
  }, [notifications, hydrated]);

  const push = useCallback((n: OsNotification) => {
    setNotifications((prev) => [n, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  useEffect(() => {
    const onNotif = (e: Event) => {
      const ce = e as CustomEvent<{ notification?: OsNotification }>;
      const n = ce.detail?.notification;
      if (!n?.id) return;
      push(n);
    };

    const onLegacy = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const m = ce.detail?.message?.trim();
      if (!m) return;
      push({
        id: `legacy-${Date.now()}`,
        title: 'Notice',
        body: m,
        level: 'warning',
        timestamp: Date.now(),
        read: false,
      });
    };

    window.addEventListener(OS_NOTIFICATION_EVENT, onNotif as EventListener);
    window.addEventListener(LEGACY_NOTICE_EVENT, onLegacy as EventListener);
    return () => {
      window.removeEventListener(OS_NOTIFICATION_EVENT, onNotif as EventListener);
      window.removeEventListener(LEGACY_NOTICE_EVENT, onLegacy as EventListener);
    };
  }, [push]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
    }),
    [notifications, unreadCount, markRead, markAllRead, dismiss, clearAll]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
