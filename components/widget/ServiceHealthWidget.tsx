'use client';

import { useOS } from '@/components/os-context';
import { useSystemHealth } from '@/hooks/use-system-health';
import { cn } from '@/lib/utils';

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

const STATUS_COLOR: Record<ServiceStatus, string> = {
  healthy: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]',
  degraded: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]',
  unhealthy: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]',
  unavailable: 'bg-red-500/60',
  not_initialized: 'bg-white/20',
  unknown: 'bg-white/15',
};

const STATUS_TEXT: Record<ServiceStatus, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-yellow-400',
  unhealthy: 'text-red-400',
  unavailable: 'text-red-400/70',
  not_initialized: 'text-white/35',
  unknown: 'text-white/30',
};

const KNOWN_SERVICES: { name: string; label: string }[] = [
  { name: 'ollama', label: 'Ollama LLM' },
  { name: 'chromadb', label: 'ChromaDB' },
  { name: 'postgres', label: 'PostgreSQL' },
  { name: 'redis', label: 'Redis' },
  { name: 'kafka', label: 'Kafka' },
];

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
  if (!raw || typeof raw !== 'object') return [];
  const rawServices = (raw as Record<string, unknown>).services;
  if (!Array.isArray(rawServices)) return [];

  const byName = new Map<string, ServiceEntry>();
  for (const s of rawServices as unknown[]) {
    if (!s || typeof s !== 'object') continue;
    const svc = s as Record<string, unknown>;
    const name = String(svc.name ?? '');
    byName.set(name, {
      name,
      label: KNOWN_SERVICES.find((k) => k.name === name)?.label ?? name,
      status: normalizeStatus(svc.status),
      latency_ms: typeof svc.latency_ms === 'number' ? svc.latency_ms : undefined,
      document_count: typeof svc.document_count === 'number' ? svc.document_count : undefined,
      error: typeof svc.error === 'string' ? svc.error : undefined,
    });
  }

  // Build the final list: known services first, then merge discovered ones
  return KNOWN_SERVICES.map(
    ({ name, label }) => byName.get(name) ?? { name, label, status: 'unknown' as ServiceStatus }
  );
}

export function ServiceHealthWidget() {
  const { raw, overall, loading } = useSystemHealth(30_000);
  const { openApp } = useOS();
  const services = parseServices(raw);

  return (
    <div className="flex w-[220px] flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
          System Health
        </span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
            overall === 'online' && 'bg-emerald-400/15 text-emerald-300',
            overall === 'degraded' && 'bg-yellow-400/15 text-yellow-300',
            overall === 'offline' && 'bg-red-400/15 text-red-300'
          )}
        >
          {loading ? '…' : overall}
        </span>
      </div>

      {/* Service rows */}
      <div className="flex flex-col gap-1">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/4 px-2.5 py-1.5"
            title={svc.error ?? svc.status}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_COLOR[svc.status])}
                aria-label={svc.status}
              />
              <span className="text-[11px] text-white/75">{svc.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {svc.latency_ms !== undefined && (
                <span className="text-[9px] text-white/35">{Math.round(svc.latency_ms)}ms</span>
              )}
              {svc.document_count !== undefined && (
                <span className="text-[9px] text-white/35">{svc.document_count}docs</span>
              )}
              <span className={cn('text-[9px]', STATUS_TEXT[svc.status])}>
                {svc.status === 'not_initialized'
                  ? 'idle'
                  : svc.status === 'unknown'
                    ? '—'
                    : svc.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-0.5 text-[9px] text-white/25 hover:text-white/50 transition-colors text-right"
        onClick={() => openApp('settings')}
      >
        View in Settings →
      </button>
    </div>
  );
}
