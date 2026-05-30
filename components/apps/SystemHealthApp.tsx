'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSystemHealth } from '@/hooks/use-system-health';
import { useSystemStats } from '@/hooks/use-system-stats';
import {
  Activity,
  Database,
  Cpu,
  HardDrive,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface ServiceDefinition {
  key: string;
  name: string;
}

const SERVICES: ServiceDefinition[] = [
  { key: 'postgres', name: 'PostgreSQL' },
  { key: 'redis', name: 'Redis Cache' },
  { key: 'kafka', name: 'Kafka Event Bus' },
  { key: 'chromadb', name: 'ChromaDB AI Memory' },
  { key: 'minio', name: 'MinIO Blob Storage' },
  { key: 'ollama', name: 'Ollama LLM Provider' },
];

const SERVICE_META = [
  {
    key: 'postgres',
    label: 'PostgreSQL',
    analogy: 'OS Disk Tables / Metadata',
    color: '#6366f1',
    icon: <Database className="h-4 w-4" />,
  },
  {
    key: 'redis',
    label: 'Redis Cache',
    analogy: 'OS RAM / L2 Cache',
    color: '#f43f5e',
    icon: <Cpu className="h-4 w-4" />,
  },
  {
    key: 'kafka',
    label: 'Kafka',
    analogy: 'OS System Bus / Signal Interrupts',
    color: '#eab308',
    icon: <Server className="h-4 w-4" />,
  },
  {
    key: 'chromadb',
    label: 'ChromaDB',
    analogy: 'OS Long-Term Cognitive Storage',
    color: '#a855f7',
    icon: <Activity className="h-4 w-4" />,
  },
  {
    key: 'minio',
    label: 'MinIO',
    analogy: 'OS Local Object Storage / Device Driver',
    color: '#06b6d4',
    icon: <HardDrive className="h-4 w-4" />,
  },
  {
    key: 'ollama',
    label: 'Ollama',
    analogy: 'OS Core AI Co-Processor',
    color: '#10b981',
    icon: <Zap className="h-4 w-4" />,
  },
];

export function SystemHealthApp() {
  const { raw, overall, loading, error, refetch } = useSystemHealth(10000);
  const stats = useSystemStats();
  const hostStats = stats.hostStats;

  const servicesList = useMemo(() => {
    return (raw?.services as Record<string, any>[]) || [];
  }, [raw]);

  const getServiceState = (key: string) => {
    const srv = servicesList.find((s) => s.name === key);
    if (!srv) return 'not_configured';
    return srv.status || 'offline';
  };

  const getServiceLatency = (key: string) => {
    const srv = servicesList.find((s) => s.name === key);
    if (!srv) return null;
    return srv.latency_ms || null;
  };

  const getServiceExtra = (key: string) => {
    const srv = servicesList.find((s) => s.name === key);
    if (!srv) return null;
    if (key === 'chromadb') return `Count: ${srv.document_count ?? 0}`;
    if (key === 'kafka') return `Topics: ${srv.topic_count ?? 0}`;
    if (key === 'minio') return srv.endpoint ? `Endpoint: ${srv.endpoint}` : null;
    return null;
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0a0c10] p-6 text-slate-300 font-sans">
      {/* App Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            DurgasOS Task Manager
          </h2>
          <p className="text-xs text-slate-500">
            Live monitoring of the DurgasOS core infrastructure services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/5 px-3 py-1.5 text-xs">
            <span className="text-slate-500">Overall status:</span>
            <span
              className={`flex items-center gap-1 font-bold ${
                overall === 'online'
                  ? 'text-emerald-400'
                  : overall === 'degraded'
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {overall === 'online' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {overall === 'degraded' && <AlertTriangle className="h-3.5 w-3.5" />}
              {overall === 'offline' && <XCircle className="h-3.5 w-3.5" />}
              {overall.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Host Metrics Card */}
      {hostStats && (
        <div className="mb-6 rounded-xl border border-white/5 bg-black/40 p-4 backdrop-blur-md">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Host Telemetry (psutil)
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'CPU Load', value: `${hostStats.cpu.usagePct}%` },
              { label: 'RAM Load', value: `${hostStats.ram.pct}%` },
              { label: 'Disk Space', value: `${hostStats.storage?.[0]?.pct ?? 0}%` },
              { label: 'CPU Cores', value: `${hostStats.cpu.cores}` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-1 rounded-lg bg-white/[0.02] border border-white/[0.03] p-2.5"
              >
                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                  {label}
                </span>
                <span className="text-lg font-mono font-bold text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {SERVICES.map((srv) => {
          const state = getServiceState(srv.key);
          const meta = SERVICE_META.find((m) => m.key === srv.key);
          const latency = getServiceLatency(srv.key);
          const extra = getServiceExtra(srv.key);

          const stateColor =
            state === 'healthy'
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : state === 'degraded' || state === 'warning'
                ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                : state === 'not_configured' || state === 'not_initialized'
                  ? 'bg-slate-600'
                  : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';

          return (
            <motion.div
              key={srv.key}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-white/5 bg-black/30 p-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className="rounded-lg p-2 bg-white/5 border border-white/5"
                  style={{ color: meta?.color }}
                >
                  {meta?.icon}
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${stateColor}`} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-200">{srv.name}</h3>
              <p className="text-[11px] text-slate-500 mt-1">{meta?.analogy}</p>

              <div className="mt-4 flex flex-col gap-1.5 border-t border-white/5 pt-3 text-[11px] font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Status</span>
                  <span
                    className={`uppercase font-bold ${
                      state === 'healthy'
                        ? 'text-emerald-400'
                        : state === 'degraded'
                          ? 'text-amber-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {state.replace('_', ' ')}
                  </span>
                </div>
                {latency !== null && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Latency</span>
                    <span className="text-slate-300">{latency} ms</span>
                  </div>
                )}
                {extra && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Details</span>
                    <span className="text-slate-300 truncate max-w-[120px]">{extra}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Architecture legend */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          OS Architecture Mapping
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px]">
          {SERVICE_META.map((m) => (
            <div key={m.key} className="flex items-center gap-2 text-slate-500">
              <span style={{ color: m.color }}>{m.icon}</span>
              <span className="font-semibold text-slate-400">{m.label}</span>
              <span>→</span>
              <span>{m.analogy}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SystemHealthApp;
