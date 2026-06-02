'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Play, Pause, Trash2, Cpu } from 'lucide-react';
import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';
import { swallowClientError } from '@/lib/safe-client-storage';

interface KafkaEvent {
  id: string;
  timestamp: string;
  topic: string;
  eventType: string;
  payload: Record<string, unknown>;
  partition?: number;
  offset?: number;
}

const ALL_TOPICS = [
  'workflow.run.requested',
  'workflow.run.completed',
  'workflow.run.failed',
  'file.uploaded',
  'file.embedded',
  'agent.step',
  'agent.completed',
  'system.feed',
  'notification.sent',
  'os.desktop.event',
];

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

function formatTimeOffset(iso: string): string {
  const d = new Date(iso);
  const seconds = d.getSeconds() + d.getMilliseconds() / 1000;
  return seconds.toFixed(3).padStart(6, '0');
}

function getEventMessage(ev: KafkaEvent): string {
  const payload = ev.payload;
  if (payload.msg) return String(payload.msg);
  if (payload.filename) return `file: ${payload.filename} (${payload.bucket || 'uploads'})`;
  if (payload.workflow_id) return `workflow: ${payload.name || payload.workflow_id}`;
  if (payload.model) return `llm: ${payload.model} (${payload.tokens} tokens)`;
  if (payload.chunks) return `vector store: indexed ${payload.chunks} chunks`;
  if (payload.app) return `app: launch ${payload.app} (pid ${payload.pid})`;
  if (payload.title) return `notify: ${payload.title}`;
  return `${ev.eventType} - ${JSON.stringify(payload).slice(0, 40)}`;
}

function getTopicColorClass(topic: string): string {
  switch (topic) {
    case 'system.feed':
      return 'text-yellow-400/80';
    case 'workflow.run.requested':
    case 'workflow.run.completed':
    case 'workflow.run.failed':
      return 'text-blue-400/80';
    case 'file.uploaded':
    case 'file.embedded':
      return 'text-purple-400/80';
    case 'agent.step':
    case 'agent.completed':
      return 'text-cyan-400/80';
    case 'os.desktop.event':
      return 'text-pink-400/80';
    default:
      return 'text-slate-400/80';
  }
}

export function SystemFeedWidget() {
  const [events, setEvents] = useState<KafkaEvent[]>([]);
  const [paused, setPaused] = useState(false);
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
    setEvents((prev) => [...prev, ev].slice(-10));
  }, []);

  // Auto-scroll to bottom of the feed
  useEffect(() => {
    if (!paused && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, paused]);

  // Simulate event stream when WebSocket is disconnected
  useEffect(() => {
    let idx = 0;
    simIntervalRef.current = setInterval(() => {
      const template = SIMULATED_EVENTS[idx % SIMULATED_EVENTS.length];
      addEvent({
        ...template,
        timestamp: new Date().toISOString(),
        partition: Math.floor(Math.random() * 3),
        offset: Math.floor(Math.random() * 5000),
      });
      idx++;
    }, 2500);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [addEvent]);

  // Connect to the gateway via WebSocket
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
        } catch (err) {
          swallowClientError('system-feed-widget.ws.parse', err);
        }
      };

      ws.onclose = () => setConnected(false);
      ws.onerror = () => ws?.close();
    } catch {
      // ws fails open
    }

    return () => {
      dead = true;
      ws?.close();
    };
  }, [addEvent]);

  return (
    <DesktopWidgetChrome className="w-[300px] border-cyan-500/20 bg-slate-950/65 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
      <div className="flex flex-col gap-2 font-mono text-xs text-[#a6e22e]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <div className="flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
              dmesg --follow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse'
              }`}
              title={connected ? 'Connected to Event Bus' : 'Simulating Event Bus'}
            />
            <span className="text-[9px] text-slate-400">{connected ? 'LIVE' : 'SIM'}</span>
          </div>
        </div>

        {/* Console logs */}
        <div
          ref={listRef}
          className="flex h-[180px] flex-col gap-1 overflow-y-auto pr-1 text-[10px] leading-relaxed scrollbar-thin select-text"
        >
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500 italic">
              Loading dmesg logs...
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {events.map((ev) => {
                const topicColor = getEventMessage(ev)
                  ? getTopicColorClass(ev.topic)
                  : 'text-slate-400';
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-start gap-1"
                  >
                    <span className="text-slate-500 shrink-0 select-none">
                      [{formatTimeOffset(ev.timestamp)}]
                    </span>
                    <span className="shrink-0 font-bold select-none text-cyan-500/80">
                      &lt;{ev.topic.split('.').pop()}&gt;
                    </span>
                    <span className={topicColor}>{getEventMessage(ev)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between border-t border-cyan-500/20 pt-2 text-[9px] text-slate-500">
          <span className="flex items-center gap-1 select-none">
            <Cpu className="h-3 w-3 text-cyan-400/60" />
            <span>KAFKA EVENT LOG</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="hover:text-cyan-300 transition-colors flex items-center gap-0.5"
              title={paused ? 'Resume logs' : 'Pause logs'}
            >
              {paused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
              <span>{paused ? 'RESUME' : 'PAUSE'}</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setEvents([])}
              className="hover:text-red-400 transition-colors flex items-center gap-0.5"
              title="Clear logs"
            >
              <Trash2 className="h-2.5 w-2.5" />
              <span>CLEAR</span>
            </button>
          </div>
        </div>
      </div>
    </DesktopWidgetChrome>
  );
}
