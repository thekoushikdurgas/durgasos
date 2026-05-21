import type { AppId } from '@/lib/apps';

export const OS_NOTIFICATION_EVENT = 'durgasos-os-notification';
export const OS_LOG_EVENT = 'durgasos-os-log';
export const LEGACY_NOTICE_EVENT = 'durgasos-notice';

export type NotifLevel = 'info' | 'success' | 'warning' | 'error';

export type OsNotification = {
  id: string;
  appId?: AppId;
  title: string;
  body?: string;
  level: NotifLevel;
  timestamp: number;
  read: boolean;
  action?: { label: string; event: string };
};

export type OsLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type OsLogCategory = 'os' | 'app' | 'network' | 'sync' | 'job' | 'auth';

export type OsLog = {
  id: string;
  category: OsLogCategory;
  message: string;
  level: OsLogLevel;
  timestamp: number;
  meta?: Record<string, unknown>;
};

export type OsNotificationInput = Omit<OsNotification, 'id' | 'read' | 'timestamp'>;
export type OsLogInput = Omit<OsLog, 'id' | 'timestamp'>;

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function dispatchOsNotification(input: OsNotificationInput): void {
  if (typeof window === 'undefined') return;
  const notification: OsNotification = {
    ...input,
    id: newId(),
    read: false,
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(OS_NOTIFICATION_EVENT, { detail: { notification } }));
}

export function dispatchOsLog(input: OsLogInput): void {
  if (typeof window === 'undefined') return;
  const log: OsLog = {
    ...input,
    id: newId(),
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(OS_LOG_EVENT, { detail: { log } }));
}

/** Bridge legacy toast-style notices into the notification center. */
export function dispatchLegacyNotice(message: string, level: NotifLevel = 'warning'): void {
  dispatchOsNotification({ title: 'Notice', body: message, level });
}
