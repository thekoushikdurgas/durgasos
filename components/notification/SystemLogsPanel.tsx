'use client';

import { Activity, Cpu, FileClock, HardDrive, Monitor, Wifi } from 'lucide-react';

import { LogRow } from '@/components/notification/LogRow';
import { StatBar } from '@/components/notification/StatBar';
import { useNotificationSidebarExpanded } from '@/components/notification/NotificationSidebarExpandedContext';
import type { SystemStats } from '@/hooks/use-system-stats';
import type { OsLog, OsLogLevel } from '@/lib/notifications';
import { cn } from '@/lib/utils';

type LogFilter = OsLogLevel | 'all';

type Props = {
  stats: SystemStats;
  filteredLogs: OsLog[];
  levelFilter: LogFilter;
  setLevelFilter: (f: LogFilter) => void;
};

export function SystemLogsPanel({ stats, filteredLogs, levelFilter, setLevelFilter }: Props) {
  const expanded = useNotificationSidebarExpanded();
  if (!expanded) return null;

  const memoryDetail = stats.memory
    ? `${stats.memory.usedMb.toFixed(0)} / ${stats.memory.totalMb.toFixed(0)} MB`
    : 'N/A';
  const storageDetail = stats.storage
    ? `${stats.storage.usedMb.toFixed(0)} / ${stats.storage.quotaMb.toFixed(0)} MB`
    : 'N/A';

  const backendDot =
    stats.backendHealth === 'online'
      ? 'bg-emerald-400'
      : stats.backendHealth === 'degraded'
        ? 'bg-amber-400'
        : 'bg-red-500';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-white/5 p-3">
        <p className="text-sm font-medium text-slate-300">System status</p>
        <StatBar label="Memory (heap)" pct={stats.memory?.pct ?? 0} detail={memoryDetail} />
        <StatBar label="Storage" pct={stats.storage?.pct ?? 0} detail={storageDetail} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Cpu className="h-3 w-3" />
              CPU
            </div>
            <p className="font-medium capitalize text-slate-200">
              {stats.cpuPressure ?? 'measuring…'}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Monitor className="h-3 w-3" />
              GPU
            </div>
            <p className="font-medium text-slate-500">N/A</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Wifi className="h-3 w-3" />
              Network
            </div>
            <p className="font-medium text-slate-200">
              {stats.network.downlinkMbps != null ? `${stats.network.downlinkMbps} Mbps` : '—'}
              {stats.network.effectiveType ? ` · ${stats.network.effectiveType}` : ''}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <HardDrive className="h-3 w-3" />
              Backend
            </div>
            <p className="flex items-center gap-1.5 font-medium capitalize text-slate-200">
              <span className={cn('h-2 w-2 rounded-full', backendDot)} />
              {stats.backendHealth}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Activity
              className={cn('h-3 w-3', stats.wsGatewayOk ? 'text-emerald-400' : 'text-red-400')}
            />
            WS {stats.wsGatewayOk ? 'up' : 'down'}
          </span>
          {stats.activeConnections != null ? (
            <span>{stats.activeConnections} connections</span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-white/5 px-3 py-2">
        <FileClock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-sm font-medium text-slate-400">OS logs</span>
        <div className="ml-auto flex gap-1">
          {(['all', 'warn', 'error'] as const satisfies readonly LogFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={cn(
                'rounded-md px-2 py-1.5 text-[10px] capitalize transition-colors',
                levelFilter === f
                  ? 'bg-white/15 text-white'
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              )}
              onClick={() => setLevelFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No log entries</p>
        ) : (
          filteredLogs.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
