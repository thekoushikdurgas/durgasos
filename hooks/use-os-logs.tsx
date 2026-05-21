'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  LEGACY_NOTICE_EVENT,
  OS_LOG_EVENT,
  type OsLog,
  type OsLogLevel,
} from '@/lib/notifications';

const MAX_LOGS = 200;

export type OsLogsContextValue = {
  logs: OsLog[];
  levelFilter: OsLogLevel | 'all';
  setLevelFilter: (f: OsLogLevel | 'all') => void;
  filteredLogs: OsLog[];
  clearLogs: () => void;
};

const OsLogsContext = createContext<OsLogsContextValue | null>(null);

export function OsLogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<OsLog[]>([]);
  const [levelFilter, setLevelFilter] = useState<OsLogLevel | 'all'>('all');

  const push = (log: OsLog) => {
    setLogs((prev) => [log, ...prev].slice(0, MAX_LOGS));
  };

  useEffect(() => {
    const onLog = (e: Event) => {
      const ce = e as CustomEvent<{ log?: OsLog }>;
      const log = ce.detail?.log;
      if (!log?.id) return;
      push(log);
    };

    const onLegacy = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const m = ce.detail?.message?.trim();
      if (!m) return;
      push({
        id: `legacy-log-${Date.now()}`,
        category: 'os',
        message: m,
        level: 'info',
        timestamp: Date.now(),
      });
    };

    window.addEventListener(OS_LOG_EVENT, onLog as EventListener);
    window.addEventListener(LEGACY_NOTICE_EVENT, onLegacy as EventListener);
    return () => {
      window.removeEventListener(OS_LOG_EVENT, onLog as EventListener);
      window.removeEventListener(LEGACY_NOTICE_EVENT, onLegacy as EventListener);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    if (levelFilter === 'all') return logs;
    if (levelFilter === 'warn') {
      return logs.filter((l) => l.level === 'warn' || l.level === 'error');
    }
    return logs.filter((l) => l.level === levelFilter);
  }, [logs, levelFilter]);

  const value = useMemo<OsLogsContextValue>(
    () => ({
      logs,
      levelFilter,
      setLevelFilter,
      filteredLogs,
      clearLogs: () => setLogs([]),
    }),
    [logs, levelFilter, filteredLogs]
  );

  return <OsLogsContext.Provider value={value}>{children}</OsLogsContext.Provider>;
}

export function useOsLogs(): OsLogsContextValue {
  const ctx = useContext(OsLogsContext);
  if (!ctx) {
    throw new Error('useOsLogs must be used within OsLogsProvider');
  }
  return ctx;
}
