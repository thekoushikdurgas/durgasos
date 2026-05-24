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

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  }
  return `${bytesPerSec.toFixed(0)} B/s`;
}

export function SystemLogsPanel({ stats, filteredLogs, levelFilter, setLevelFilter }: Props) {
  const expanded = useNotificationSidebarExpanded();
  const hostStats = stats.hostStats;

  if (!expanded) {
    const cpuPct = hostStats
      ? hostStats.cpu.usagePct
      : stats.cpuPressure === 'critical'
        ? 90
        : stats.cpuPressure === 'serious'
          ? 60
          : stats.cpuPressure === 'fair'
            ? 30
            : 10;
    const ramPct = hostStats ? hostStats.ram.pct : (stats.memory?.pct ?? 0);
    const diskPct = hostStats ? (hostStats.storage[0]?.pct ?? 0) : (stats.storage?.pct ?? 0);

    const isNetActive = hostStats
      ? hostStats.network.uploadSpeedBytesSec > 1024 ||
        hostStats.network.downloadSpeedBytesSec > 1024
      : (stats.network.downlinkMbps ?? 0) > 0;

    return (
      <div className="flex flex-col items-center gap-4 py-4 text-slate-400">
        {/* CPU */}
        <div
          className="group relative flex flex-col items-center gap-1"
          title={`CPU: ${cpuPct.toFixed(0)}%`}
        >
          <Cpu
            className={cn(
              'h-4 w-4',
              cpuPct > 80 ? 'text-red-400' : cpuPct > 50 ? 'text-amber-400' : 'text-slate-400'
            )}
          />
          <div className="h-6 w-1 rounded-full bg-white/10 overflow-hidden flex flex-col justify-end">
            <div
              className={cn(
                'w-full rounded-full transition-all duration-500',
                cpuPct > 80 ? 'bg-red-400' : cpuPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              )}
              style={{ height: `${cpuPct}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div
          className="group relative flex flex-col items-center gap-1"
          title={`RAM: ${ramPct.toFixed(0)}%`}
        >
          <Activity
            className={cn(
              'h-4 w-4',
              ramPct > 80 ? 'text-red-400' : ramPct > 60 ? 'text-amber-400' : 'text-slate-400'
            )}
          />
          <div className="h-6 w-1 rounded-full bg-white/10 overflow-hidden flex flex-col justify-end">
            <div
              className={cn(
                'w-full rounded-full transition-all duration-500',
                ramPct > 80 ? 'bg-red-400' : ramPct > 60 ? 'bg-amber-400' : 'bg-emerald-400'
              )}
              style={{ height: `${ramPct}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div
          className="group relative flex flex-col items-center gap-1"
          title={`Disk: ${diskPct.toFixed(0)}%`}
        >
          <HardDrive
            className={cn(
              'h-4 w-4',
              diskPct > 90 ? 'text-red-400' : diskPct > 75 ? 'text-amber-400' : 'text-slate-400'
            )}
          />
          <div className="h-6 w-1 rounded-full bg-white/10 overflow-hidden flex flex-col justify-end">
            <div
              className={cn(
                'w-full rounded-full transition-all duration-500',
                diskPct > 90 ? 'bg-red-400' : diskPct > 75 ? 'bg-amber-400' : 'bg-emerald-400'
              )}
              style={{ height: `${diskPct}%` }}
            />
          </div>
        </div>

        {/* Network */}
        <div
          className="group relative flex flex-col items-center"
          title={
            hostStats
              ? `Net: ↑${formatSpeed(hostStats.network.uploadSpeedBytesSec)} ↓${formatSpeed(hostStats.network.downloadSpeedBytesSec)}`
              : 'Network'
          }
        >
          <Wifi
            className={cn(
              'h-4 w-4 transition-colors',
              isNetActive ? 'text-cyan-400' : 'text-slate-500'
            )}
          />
          {isNetActive ? (
            <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

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
        {hostStats ? (
          <>
            <StatBar
              label="CPU"
              pct={hostStats.cpu.usagePct}
              detail={`${hostStats.cpu.usagePct.toFixed(1)}% (${hostStats.cpu.cores} Cores)`}
            />
            <StatBar
              label="Memory"
              pct={hostStats.ram.pct}
              detail={`${hostStats.ram.usedGb.toFixed(1)} / ${hostStats.ram.totalGb.toFixed(1)} GB`}
            />
            {hostStats.gpu ? (
              <StatBar
                label={`GPU (${hostStats.gpu.name || 'N/A'})`}
                pct={hostStats.gpu.usagePct ?? 0}
                detail={`${(hostStats.gpu.usagePct ?? 0).toFixed(1)}% (${hostStats.gpu.memoryUsedGb?.toFixed(1)} / ${hostStats.gpu.memoryTotalGb?.toFixed(1)} GB)`}
              />
            ) : null}
            {hostStats.storage.map((volume) => (
              <StatBar
                key={volume.mount}
                label={`Storage (${volume.mount})`}
                pct={volume.pct}
                detail={`${volume.usedGb.toFixed(0)} / ${volume.totalGb.toFixed(0)} GB`}
              />
            ))}
          </>
        ) : (
          <>
            <StatBar label="Memory (heap)" pct={stats.memory?.pct ?? 0} detail={memoryDetail} />
            <StatBar label="Storage" pct={stats.storage?.pct ?? 0} detail={storageDetail} />
          </>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Cpu className="h-3 w-3" />
              CPU Pressure
            </div>
            <p className="font-medium capitalize text-slate-200">
              {stats.cpuPressure ?? 'measuring…'}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Monitor className="h-3 w-3" />
              GPU Availability
            </div>
            <p className="font-medium text-slate-200">{hostStats?.gpu ? 'Available' : 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-2 col-span-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Wifi className="h-3 w-3" />
              Network Speed
            </div>
            <div className="font-medium text-slate-200 flex justify-between">
              {hostStats ? (
                <>
                  <span>↑ {formatSpeed(hostStats.network.uploadSpeedBytesSec)}</span>
                  <span>↓ {formatSpeed(hostStats.network.downloadSpeedBytesSec)}</span>
                </>
              ) : (
                <span>
                  {stats.network.downlinkMbps != null ? `${stats.network.downlinkMbps} Mbps` : '—'}
                  {stats.network.effectiveType ? ` · ${stats.network.effectiveType}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-2 col-span-2">
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <HardDrive className="h-3 w-3" />
              Backend Connection
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
