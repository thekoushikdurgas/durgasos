'use client';

import { useCallback, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  MessageSquare,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemHealth } from '@/hooks/use-system-health';
import { useChatProviders } from '@/hooks/use-chat-providers';
import { useOS } from '@/components/os-context';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

/* ─── types ─── */

type ServiceStatus =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unavailable'
  | 'not_initialized'
  | 'unknown';

type ServiceEntry = {
  name: string;
  label: string;
  status: ServiceStatus;
  latency_ms?: number;
  document_count?: number;
  error?: string;
};

/* ─── helpers ─── */

const STATUS_LABEL: Record<ServiceStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
  unavailable: 'Unavailable',
  not_initialized: 'Idle',
  unknown: 'Unknown',
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  healthy: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
  degraded: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.65)]',
  unhealthy: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.65)]',
  unavailable: 'bg-red-500/70',
  not_initialized: 'bg-white/25',
  unknown: 'bg-white/15',
};

const STATUS_CARD: Record<ServiceStatus, string> = {
  healthy: 'border-emerald-500/20 bg-emerald-500/5',
  degraded: 'border-yellow-500/20 bg-yellow-500/5',
  unhealthy: 'border-red-500/20 bg-red-500/5',
  unavailable: 'border-red-500/15 bg-red-500/5',
  not_initialized: 'border-white/8 bg-white/3',
  unknown: 'border-white/8 bg-white/3',
};

const STATUS_TEXT: Record<ServiceStatus, string> = {
  healthy: 'text-emerald-300',
  degraded: 'text-yellow-300',
  unhealthy: 'text-red-300',
  unavailable: 'text-red-300/70',
  not_initialized: 'text-white/40',
  unknown: 'text-white/30',
};

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ollama: MessageSquare,
  chromadb: Database,
  postgres: HardDrive,
  redis: Zap,
  kafka: Server,
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  ollama: 'Local LLM inference server (Ollama)',
  chromadb: 'Vector database for RAG embeddings',
  postgres: 'Primary relational database (PostgreSQL)',
  redis: 'In-memory cache and session store',
  kafka: 'Distributed event streaming platform',
};

const KNOWN_SERVICES = ['ollama', 'chromadb', 'postgres', 'redis', 'kafka'];

function normalizeStatus(raw: unknown): ServiceStatus {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'healthy') return 'healthy';
  if (s === 'degraded') return 'degraded';
  if (s === 'unhealthy') return 'unhealthy';
  if (s === 'unavailable') return 'unavailable';
  if (s === 'not_initialized') return 'not_initialized';
  return 'unknown';
}

function parseServices(raw: unknown): ServiceEntry[] {
  const rawArr =
    raw && typeof raw === 'object'
      ? (((raw as Record<string, unknown>).services as unknown[]) ?? [])
      : [];
  const byName = new Map<string, ServiceEntry>();
  for (const s of rawArr) {
    if (!s || typeof s !== 'object') continue;
    const svc = s as Record<string, unknown>;
    const name = String(svc.name ?? '');
    byName.set(name, {
      name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      status: normalizeStatus(svc.status),
      latency_ms: typeof svc.latency_ms === 'number' ? svc.latency_ms : undefined,
      document_count: typeof svc.document_count === 'number' ? svc.document_count : undefined,
      error: typeof svc.error === 'string' ? svc.error : undefined,
    });
  }
  return KNOWN_SERVICES.map(
    (name) => byName.get(name) ?? { name, label: name, status: 'unknown' as ServiceStatus }
  );
}

function latencyBar(ms: number | undefined, name: string): string {
  if (ms === undefined) return '';
  if (name === 'ollama') {
    if (ms < 500) return 'w-1/12';
    if (ms < 1000) return 'w-2/12';
    if (ms < 1500) return 'w-3/12';
    if (ms < 3000) return 'w-5/12';
    return 'w-8/12';
  }
  if (name === 'postgres') {
    if (ms < 100) return 'w-1/12';
    if (ms < 500) return 'w-2/12';
    if (ms < 1000) return 'w-3/12';
    if (ms < 2000) return 'w-5/12';
    return 'w-8/12';
  }
  if (ms < 50) return 'w-1/12';
  if (ms < 150) return 'w-2/12';
  if (ms < 300) return 'w-3/12';
  if (ms < 600) return 'w-5/12';
  return 'w-8/12';
}

function latencyColor(ms: number | undefined, name: string): string {
  if (ms === undefined) return 'bg-white/20';
  if (name === 'ollama') {
    if (ms < 1500) return 'bg-emerald-400';
    if (ms < 3000) return 'bg-yellow-400';
    return 'bg-red-400';
  }
  if (name === 'postgres') {
    if (ms < 1000) return 'bg-emerald-400';
    if (ms < 2000) return 'bg-yellow-400';
    return 'bg-red-400';
  }
  if (name === 'chromadb') {
    if (ms < 200) return 'bg-emerald-400';
    if (ms < 500) return 'bg-yellow-400';
    return 'bg-red-400';
  }
  if (ms < 100) return 'bg-emerald-400';
  if (ms < 300) return 'bg-yellow-400';
  return 'bg-red-400';
}

/* ─── ServiceCard ─── */
function ServiceCard({ svc }: { svc: ServiceEntry }) {
  const Icon = SERVICE_ICONS[svc.name] ?? Server;
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all duration-200',
        STATUS_CARD[svc.status],
        'hover:brightness-110 active:scale-[0.99]'
      )}
      onClick={() => setExpanded((p) => !p)}
      aria-expanded={expanded}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span
          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[svc.status])}
          aria-hidden
        />

        {/* Icon + name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90">{svc.label}</p>
            <p className="text-[11px] text-white/40 truncate">
              {SERVICE_DESCRIPTIONS[svc.name] ?? 'Backend service'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span className={cn('shrink-0 text-xs font-medium', STATUS_TEXT[svc.status])}>
          {STATUS_LABEL[svc.status]}
        </span>
      </div>

      {/* Latency bar */}
      {svc.latency_ms !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                latencyBar(svc.latency_ms, svc.name),
                latencyColor(svc.latency_ms, svc.name)
              )}
            />
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-white/40">
            {Math.round(svc.latency_ms)} ms
          </span>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 border-t border-white/10 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Service</span>
            <span className="font-mono text-white/70">{svc.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Status</span>
            <span className={cn('font-medium', STATUS_TEXT[svc.status])}>
              {STATUS_LABEL[svc.status]}
            </span>
          </div>
          {svc.latency_ms !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Latency</span>
              <span className="tabular-nums text-white/70">{svc.latency_ms.toFixed(2)} ms</span>
            </div>
          )}
          {svc.document_count !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Documents</span>
              <span className="tabular-nums text-white/70">
                {svc.document_count.toLocaleString()}
              </span>
            </div>
          )}
          {svc.error && (
            <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2">
              <p className="text-[11px] text-red-300/80 break-all">{svc.error}</p>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

/* ─── SettingsSystemHealthPane (main export) ─── */
export function SettingsSystemHealthPane() {
  const { telemetry } = useOS();
  const { providers: llmProviders, loading: llmLoading } = useChatProviders();
  const { raw, overall, loading, error, refetch } = useSystemHealth(30_000);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const {
    raw: fastRaw,
    overall: fastOverall,
    loading: fastLoading,
    refetch: fastRefetch,
  } = useSystemHealth(autoRefresh ? 15_000 : 0);

  const services = parseServices(fastRaw ?? raw);
  const currentOverall = fastOverall !== 'offline' ? fastOverall : overall;
  const currentLoading = fastLoading || loading;

  const handleRefresh = useCallback(() => {
    void fastRefetch();
    void refetch();
  }, [fastRefetch, refetch]);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const totalKnown = services.length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white/90">System health</h2>
            <p className="mt-0.5 text-sm text-white/45">Live status of all backend services</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Overall pill */}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                currentOverall === 'online' &&
                  'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                currentOverall === 'degraded' &&
                  'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
                currentOverall === 'offline' && 'border-red-500/30 bg-red-500/10 text-red-300'
              )}
            >
              {currentOverall === 'online' ? (
                <Wifi className="h-3 w-3" aria-hidden />
              ) : currentOverall === 'degraded' ? (
                <AlertCircle className="h-3 w-3" aria-hidden />
              ) : (
                <WifiOff className="h-3 w-3" aria-hidden />
              )}
              {currentLoading ? 'checking…' : currentOverall}
            </span>

            {/* Refresh */}
            <button
              type="button"
              title="Refresh now"
              aria-label="Refresh health checks"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors"
              onClick={handleRefresh}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', currentLoading && 'animate-spin')}
                aria-hidden
              />
            </button>
          </div>
        </div>

        {/* Summary stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: 'Healthy',
              value: `${healthyCount}/${totalKnown}`,
              icon: CheckCircle2,
              color: 'text-emerald-400',
            },
            {
              label: 'Degraded',
              value: services.filter((s) => s.status === 'degraded' || s.status === 'unhealthy')
                .length,
              icon: AlertCircle,
              color: 'text-yellow-400',
            },
            {
              label: 'Unavailable',
              value: services.filter((s) => s.status === 'unavailable' || s.status === 'unknown')
                .length,
              icon: WifiOff,
              color: 'text-red-400/70',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/5 p-3"
            >
              <Icon className={cn('h-4 w-4', color)} aria-hidden />
              <span className="text-lg font-bold tabular-nums text-white/90">{value}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
            <p className="text-sm text-red-300">{error.message}</p>
          </div>
        )}

        {/* Service cards */}
        <div className="space-y-3">
          {services.map((svc) => (
            <ServiceCard key={svc.name} svc={svc} />
          ))}
        </div>

        {/* Auto-refresh toggle */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <div>
            <p className="text-sm text-white/70">Auto-refresh every 15 s</p>
            <p className="text-[11px] text-white/35">Polls backend health endpoint continuously</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoRefresh}
            onClick={() => setAutoRefresh((p) => !p)}
            className={cn(
              'relative h-6 w-11 rounded-full border transition-colors duration-200',
              autoRefresh ? 'border-emerald-500/40 bg-emerald-500/20' : 'border-white/15 bg-white/8'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full border transition-transform duration-200',
                autoRefresh
                  ? 'translate-x-5 border-emerald-400/50 bg-emerald-400'
                  : 'translate-x-0 border-white/20 bg-white/30'
              )}
            />
          </button>
        </div>
      </section>

      {/* Host Telemetry Section */}
      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white/90 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-cyan-400" />
          Host hardware telemetry
        </h2>
        <p className="mb-4 text-sm text-white/45 font-normal">
          Real-time metrics from the host operating system.
        </p>
        {telemetry ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-black/25 p-4">
              <div className="flex justify-between text-xs text-white/45 mb-1">
                <span>Operating System</span>
                <span className="font-semibold text-cyan-400 capitalize">{telemetry.platform}</span>
              </div>
              <p className="text-lg font-bold text-white/95 capitalize leading-none pt-1">
                {telemetry.platform} ({telemetry.arch})
              </p>
              <div className="flex justify-between text-[11px] text-white/40 mt-3 pt-2 border-t border-white/5">
                <span>Uptime</span>
                <span className="font-mono text-white/60">{formatUptime(telemetry.uptime)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/25 p-4">
              <div className="flex justify-between text-xs text-white/45 mb-1">
                <span>CPU Load</span>
                <span className="font-semibold text-cyan-400">{telemetry.cpuLoad}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mt-2.5">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${telemetry.cpuLoad}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/25 p-4">
              <div className="flex justify-between text-xs text-white/45 mb-1">
                <span>RAM Usage</span>
                <span className="font-semibold text-purple-400">
                  {Math.round(telemetry.ramUsage)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mt-2.5">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all duration-500"
                  style={{ width: `${telemetry.ramUsage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-white/40 mt-3 pt-2 border-t border-white/5">
                <span>Memory</span>
                <span className="font-mono text-white/60">
                  {(telemetry.totalMemoryGB - telemetry.freeMemoryGB).toFixed(2)} GB /{' '}
                  {telemetry.totalMemoryGB.toFixed(1)} GB
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/3 p-6 text-center">
            <Cpu className="mx-auto h-8 w-8 text-white/20 mb-2" />
            <p className="text-xs text-white/45">
              Running in web browser. Run inside the DurgasOS Electron desktop client to capture
              local system diagnostics.
            </p>
          </div>
        )}
      </section>

      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white/90">LLM providers</h2>
        <p className="mb-4 text-sm text-white/45">
          Status from <code className="rounded bg-black/40 px-1">chat.providers</code> (API keys
          configured on the backend).
        </p>
        {llmLoading ? (
          <p className="text-sm text-white/50">Loading providers…</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {llmProviders.slice(0, 24).map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm"
              >
                <span className="truncate font-mono text-cyan-200/90">{p.name}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-medium',
                    p.status === 'available' ? 'text-emerald-300' : 'text-white/40'
                  )}
                >
                  {p.status}
                  {p.latency_tier === 'fast' ? ' ⚡' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Raw JSON debug section */}
      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/70">Raw response</h3>
          {currentLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" aria-hidden />
          )}
        </div>
        <pre className="overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 text-[10px] leading-relaxed text-slate-300 max-h-64">
          {JSON.stringify(fastRaw ?? raw ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
