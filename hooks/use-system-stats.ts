'use client';

import { useCallback, useEffect, useState } from 'react';

import type { SystemHealthOverall } from '@/hooks/use-system-health';
import { fetchBackendHealthSnapshot } from '@/lib/backend-http';

export type CpuPressure = 'nominal' | 'fair' | 'serious' | 'critical' | null;

export type SystemStats = {
  memory: { usedMb: number; totalMb: number; pct: number } | null;
  storage: { usedMb: number; quotaMb: number; pct: number } | null;
  network: { downlinkMbps: number | null; effectiveType: string | null };
  cpuPressure: CpuPressure;
  gpuAvailable: boolean;
  backendHealth: SystemHealthOverall;
  wsGatewayOk: boolean;
  activeConnections: number | null;
};

const DEFAULT_STATS: SystemStats = {
  memory: null,
  storage: null,
  network: { downlinkMbps: null, effectiveType: null },
  cpuPressure: null,
  gpuAvailable: false,
  backendHealth: 'offline',
  wsGatewayOk: false,
  activeConnections: null,
};

type NetworkInformationLike = {
  downlink?: number;
  effectiveType?: string;
};

function readMemory(): SystemStats['memory'] {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };
  const mem = perf.memory;
  if (!mem?.jsHeapSizeLimit) return null;
  const usedMb = mem.usedJSHeapSize / (1024 * 1024);
  const totalMb = mem.jsHeapSizeLimit / (1024 * 1024);
  const pct = totalMb > 0 ? Math.min(100, (usedMb / totalMb) * 100) : 0;
  return { usedMb, totalMb, pct };
}

async function readStorage(): Promise<SystemStats['storage']> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const quota = est.quota ?? 0;
    if (!quota) return null;
    const usedMb = used / (1024 * 1024);
    const quotaMb = quota / (1024 * 1024);
    const pct = Math.min(100, (used / quota) * 100);
    return { usedMb, quotaMb, pct };
  } catch {
    return null;
  }
}

function readNetwork(): SystemStats['network'] {
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!conn) return { downlinkMbps: null, effectiveType: null };
  return {
    downlinkMbps: typeof conn.downlink === 'number' ? conn.downlink : null,
    effectiveType: conn.effectiveType ?? null,
  };
}

/** rAF frame delta heuristic when Compute Pressure API is unavailable. */
function useRafCpuPressure(): CpuPressure {
  const [pressure, setPressure] = useState<CpuPressure>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let last = performance.now();
    let sum = 0;
    let count = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (delta > 0 && delta < 500) {
        sum += delta;
        count += 1;
      }
      if (count >= 30) {
        const avg = sum / count;
        let next: CpuPressure = 'nominal';
        if (avg > 32) next = 'critical';
        else if (avg > 24) next = 'serious';
        else if (avg > 18) next = 'fair';
        setPressure(next);
        sum = 0;
        count = 0;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return pressure;
}

function parseBackendHealth(health: unknown): SystemHealthOverall {
  if (!health || typeof health !== 'object') return 'offline';
  const st = String((health as Record<string, unknown>).status ?? '').toLowerCase();
  if (st === 'healthy') return 'online';
  if (st === 'degraded') return 'degraded';
  return 'offline';
}

export function useSystemStats(
  backendHealthFromHook?: SystemHealthOverall,
  pollMs = 3000
): SystemStats {
  const rafPressure = useRafCpuPressure();
  const [stats, setStats] = useState<SystemStats>(DEFAULT_STATS);

  const poll = useCallback(async () => {
    const storage = await readStorage();
    let backendHealth: SystemHealthOverall = backendHealthFromHook ?? 'offline';
    let wsGatewayOk = false;
    let activeConnections: number | null = null;

    try {
      const snap = await fetchBackendHealthSnapshot();
      if (snap.health) {
        backendHealth = parseBackendHealth(snap.health);
      }
      wsGatewayOk = snap.wsGateway?.ok ?? false;
      const wsBody = snap.wsGateway?.body;
      if (wsBody && typeof wsBody === 'object') {
        const ac = (wsBody as Record<string, unknown>).active_connections;
        if (typeof ac === 'number') activeConnections = ac;
      }
    } catch {
      backendHealth = 'offline';
      wsGatewayOk = false;
    }

    setStats((prev) => ({
      ...prev,
      memory: readMemory(),
      storage,
      network: readNetwork(),
      cpuPressure: rafPressure,
      gpuAvailable: false,
      backendHealth: backendHealthFromHook ?? backendHealth,
      wsGatewayOk,
      activeConnections,
    }));
  }, [backendHealthFromHook, rafPressure]);

  useEffect(() => {
    const kick = window.setTimeout(() => {
      void poll();
    }, 0);
    const id = window.setInterval(() => void poll(), pollMs);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [poll, pollMs]);

  return stats;
}
