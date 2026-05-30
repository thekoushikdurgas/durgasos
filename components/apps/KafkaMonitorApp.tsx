'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface KafkaEvent {
  id: string;
  timestamp: string;
  topic: string;
  eventType: string;
  payload: Record<string, unknown>;
  partition?: number;
  offset?: number;
}

const TOPIC_COLORS: Record<string, string> = {
  'workflow.run.requested': 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  'workflow.run.completed': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  'workflow.run.failed': 'text-red-400 border-red-500/40 bg-red-500/10',
  'file.uploaded': 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  'file.embedded': 'text-violet-400 border-violet-500/40 bg-violet-500/10',
  'agent.step': 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
  'agent.completed': 'text-teal-400 border-teal-500/40 bg-teal-500/10',
  'system.feed': 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  'notification.sent': 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  'os.desktop.event': 'text-pink-400 border-pink-500/40 bg-pink-500/10',
};

const ALL_TOPICS = Object.keys(TOPIC_COLORS);

const SIMULATED_EVENTS: Omit<KafkaEvent, 'id' | 'timestamp'>[] = [
  {
    topic: 'system.feed',
    eventType: 'kernel.boot',
    payload: { msg: 'DurgasOS kernel initialized', pid: 1 },
  },
  {
    topic: 'agent.step',
    eventType: 'llm.request',
    payload: { model: 'gemini-2.5-flash', tokens: 512, user: 'durga' },
  },
  {
    topic: 'file.uploaded',
    eventType: 'upload.complete',
    payload: { filename: 'research.pdf', size_bytes: 204800, bucket: 'user-uploads' },
  },
  {
    topic: 'workflow.run.requested',
    eventType: 'workflow.queued',
    payload: { workflow_id: 'wf-001', name: 'Data Pipeline' },
  },
  {
    topic: 'agent.completed',
    eventType: 'agent.done',
    payload: { result: 'success', duration_ms: 1243 },
  },
  {
    topic: 'file.embedded',
    eventType: 'chromadb.indexed',
    payload: { chunks: 14, collection: 'durgasai_pages' },
  },
  {
    topic: 'workflow.run.completed',
    eventType: 'workflow.done',
    payload: { steps: 5, duration_s: 8.2 },
  },
  {
    topic: 'notification.sent',
    eventType: 'push.sent',
    payload: { title: 'File ready', user: 'durga' },
  },
  {
    topic: 'os.desktop.event',
    eventType: 'window.opened',
    payload: { app: 'Terminal', pid: 4421 },
  },
  {
    topic: 'system.feed',
    eventType: 'redis.cache_hit',
    payload: { key: 'gql:system_health', ttl: 15 },
  },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) +
    '.' +
    String(d.getMilliseconds()).padStart(3, '0')
  );
}

function TopicBadge({ topic }: { topic: string }) {
  const color = TOPIC_COLORS[topic] ?? 'text-slate-400 border-slate-500/40 bg-slate-500/10';
  const short = topic.split('.').slice(-2).join('.');
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wide ${color}`}
    >
      {short}
    </span>
  );
}

export function KafkaMonitorApp() {
  const [events, setEvents] = useState<KafkaEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [connected, setConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const addEvent = useCallback((raw: Omit<KafkaEvent, 'id'>) => {
    if (pausedRef.current) return;
    const ev: KafkaEvent = { ...raw, id: crypto.randomUUID() };
    setEvents((prev) => [...prev.slice(-199), ev]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, paused]);

  // Simulate events when disconnected — starts immediately
  useEffect(() => {
    let idx = 0;
    simIntervalRef.current = setInterval(() => {
      const template = SIMULATED_EVENTS[idx % SIMULATED_EVENTS.length];
      addEvent({
        ...template,
        timestamp: new Date().toISOString(),
        partition: Math.floor(Math.random() * 3),
        offset: Math.floor(Math.random() * 10000),
      });
      idx++;
    }, 1800);
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [addEvent]);

  // Attempt WebSocket connection to /ws/gateway
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let dead = false;
    let ws: WebSocket | null = null;

    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${window.location.host}/ws/gateway`);

      ws.onopen = () => {
        if (dead) {
          ws?.close();
          return;
        }
        setConnected(true);
        // Stop simulated events when real WS is live
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        ws?.send(JSON.stringify({ type: 'subscribe', topics: ALL_TOPICS }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as Partial<KafkaEvent>;
          if (msg.topic && msg.eventType && msg.timestamp) {
            addEvent({
              topic: msg.topic,
              eventType: msg.eventType,
              timestamp: msg.timestamp,
              payload: msg.payload ?? {},
              partition: msg.partition,
              offset: msg.offset,
            });
          }
        } catch {
          /* non-JSON message */
        }
      };

      ws.onclose = () => setConnected(false);
      ws.onerror = () => ws?.close();
    } catch {
      /* WebSocket not available */
    }

    return () => {
      dead = true;
      ws?.close();
    };
  }, [addEvent]);

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.topic === filter);

  return (
    <div className="flex h-full flex-col bg-[#0a0c10] font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-black/40 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full animate-pulse ${
              connected
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
            }`}
          />
          <span className="text-xs text-slate-400">{connected ? 'Live' : 'Simulated'}</span>
        </div>
        <span className="text-slate-600">|</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="all">All Topics</option>
          {ALL_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className={`rounded px-3 py-0.5 text-xs font-semibold transition-colors ${
              paused
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            }`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={() => setEvents([])}
            className="rounded px-3 py-0.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            Clear
          </button>
          <span className="text-xs text-slate-600">{filteredEvents.length} events</span>
        </span>
      </div>

      {/* Header row */}
      <div className="flex items-center gap-4 border-b border-white/5 bg-black/20 px-4 py-1.5 text-[10px] uppercase tracking-widest text-slate-600">
        <span className="w-24">Time</span>
        <span className="w-36">Topic</span>
        <span className="w-24">Event</span>
        <span>Payload</span>
      </div>

      {/* Event list */}
      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence initial={false}>
          {filteredEvents.map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="group flex items-start gap-4 border-b border-white/[0.03] px-4 py-1.5 hover:bg-white/[0.03]"
            >
              <span className="w-24 shrink-0 text-[11px] text-slate-500">
                {formatTime(ev.timestamp)}
              </span>
              <span className="w-36 shrink-0">
                <TopicBadge topic={ev.topic} />
              </span>
              <span className="w-24 shrink-0 truncate text-[11px] text-slate-400">
                {ev.eventType}
              </span>
              <span className="flex-1 truncate text-[11px] text-slate-500">
                {JSON.stringify(ev.payload)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredEvents.length === 0 && (
          <div className="flex h-32 items-center justify-center text-xs text-slate-700">
            Waiting for events...
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 border-t border-white/5 bg-black/40 px-4 py-1 text-[10px] text-slate-600">
        <span>DurgasOS Kafka Monitor — Event Bus Inspector</span>
        <span className="ml-auto">
          {paused ? (
            <span className="text-amber-500">PAUSED</span>
          ) : (
            <span className="text-emerald-600">LIVE</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default KafkaMonitorApp;
