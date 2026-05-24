'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Cpu, Rss, Zap } from 'lucide-react';

import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';
import { cn } from '@/lib/utils';

type FeedEvent = {
  id: string;
  type: string;
  topic: string;
  message: string;
  timestamp: Date;
  level?: 'info' | 'success' | 'error' | 'warn';
};

function eventIcon(ev: FeedEvent) {
  if (ev.level === 'error' || ev.type === 'error') return AlertCircle;
  if (ev.level === 'success' || ev.type === 'done') return CheckCircle2;
  if (ev.topic === 'workflow') return Zap;
  if (ev.topic === 'agent') return Cpu;
  return Activity;
}

function eventColor(ev: FeedEvent): string {
  if (ev.level === 'error' || ev.type === 'error') return 'text-red-400';
  if (ev.level === 'success' || ev.type === 'done') return 'text-emerald-400';
  if (ev.topic === 'workflow') return 'text-sky-400';
  if (ev.topic === 'agent') return 'text-violet-400';
  return 'text-blue-400';
}

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const MAX_EVENTS = 20;

export function LiveFeedWidget() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { callStreaming } = useJsonRpcStream();
  const listRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const addEvent = useCallback((raw: Record<string, unknown>) => {
    const ev: FeedEvent = {
      id: `${Date.now()}-${Math.random()}`,
      type: String(raw.type ?? 'event'),
      topic: String(raw.topic ?? 'system'),
      message: String(raw.message ?? JSON.stringify(raw)),
      timestamp: new Date(),
      level: raw.level as FeedEvent['level'],
    };
    setEvents((prev) => [ev, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const connectRef = useRef<() => Promise<void>>(async () => {});

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    setError(null);
    setConnected(true);
    try {
      await callStreaming(
        'system.feed',
        { topic: 'default' },
        {
          onMessage: (msg) => {
            if (!mountedRef.current) return;
            addEvent(msg);
          },
          onDone: () => {
            if (!mountedRef.current) return;
            setConnected(false);
            // Auto-reconnect after 8s for continuous streaming
            retryRef.current = setTimeout(() => {
              if (mountedRef.current) void connectRef.current();
            }, 8000);
          },
          onError: (err) => {
            if (!mountedRef.current) return;
            setConnected(false);
            setError(err);
            retryRef.current = setTimeout(() => {
              if (mountedRef.current) void connectRef.current();
            }, 12000);
          },
        }
      );
    } catch {
      if (!mountedRef.current) return;
      setConnected(false);
    }
  }, [callStreaming, addEvent]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    void connect();
    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
    // connect is stable (useCallback with stable deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to top (newest events at top)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="flex w-[260px] flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Rss className="h-3 w-3 text-blue-400" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
            System Feed
          </span>
        </div>
        <span
          className={cn(
            'flex h-1.5 w-1.5 rounded-full',
            connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-white/25'
          )}
          title={connected ? 'Live' : 'Reconnecting…'}
          aria-label={connected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* Event list */}
      <div
        ref={listRef}
        className="flex max-h-[220px] flex-col gap-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="System feed events"
      >
        {events.length === 0 && !error && (
          <p className="py-3 text-center text-[10px] text-white/30">
            {connected ? 'Waiting for events…' : 'Connecting…'}
          </p>
        )}
        {error && (
          <p className="py-1 text-center text-[10px] text-red-400/70">{error} · Retrying…</p>
        )}
        {events.map((ev) => {
          const Icon = eventIcon(ev);
          const color = eventColor(ev);
          return (
            <div
              key={ev.id}
              className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/4 px-2 py-1.5 backdrop-blur-sm"
            >
              <Icon className={cn('mt-0.5 h-3 w-3 shrink-0', color)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] leading-tight text-white/80">{ev.message}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] text-white/35">{ev.topic}</span>
                  <span className="text-[9px] text-white/20">·</span>
                  <span className="text-[9px] text-white/30">{fmt(ev.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
