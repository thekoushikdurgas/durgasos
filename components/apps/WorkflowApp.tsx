'use client';

import { useCallback, useMemo, useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';

import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { useWorkflowRunner } from '@/hooks/use-workflow';
import { cn } from '@/lib/utils';

type NodeKind = 'start' | 'llm' | 'transform' | 'end';

type FlowNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  label: string;
};

const PALETTE: { kind: NodeKind; label: string }[] = [
  { kind: 'start', label: 'Start' },
  { kind: 'llm', label: 'LLM' },
  { kind: 'transform', label: 'Transform' },
  { kind: 'end', label: 'End' },
];

let nid = 0;

export function WorkflowApp() {
  const { runWorkflow } = useWorkflowRunner();
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: 'n-start', kind: 'start', x: 40, y: 80, label: 'Start' },
    { id: 'n-end', kind: 'end', x: 320, y: 200, label: 'End' },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>('n-start');
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  const addNode = useCallback((kind: NodeKind) => {
    nid += 1;
    const label = PALETTE.find((p) => p.kind === kind)?.label ?? kind;
    const id = `n-${kind}-${nid}`;
    setNodes((prev) => [
      ...prev,
      { id, kind, label, x: 120 + (prev.length % 4) * 36, y: 100 + (prev.length % 3) * 40 },
    ]);
    setSelectedId(id);
  }, []);

  const removeSelected = useCallback(() => {
    if (!selectedId || selectedId === 'n-start' || selectedId === 'n-end') return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setSelectedId('n-start');
  }, [selectedId]);

  const runDemo = useCallback(async () => {
    setRunning(true);
    setLog([]);
    try {
      await runWorkflow('demo-workflow', {
        onMessage: (msg) => {
          setLog((l) => [...l, JSON.stringify(msg)]);
        },
        onDone: (summary) => {
          setLog((l) => [...l, `done: ${JSON.stringify(summary)}`]);
        },
        onError: (err) => {
          setLog((l) => [...l, `error: ${err}`]);
        },
      });
    } catch (e) {
      setLog((l) => [...l, `catch: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setRunning(false);
    }
  }, [runWorkflow]);

  return (
    <div className="absolute inset-0 flex bg-slate-950/95 text-slate-100">
      <aside className="flex w-52 shrink-0 flex-col gap-3 border-r border-white/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Palette</p>
        <div className="flex flex-col gap-2">
          {PALETTE.map((p) => (
            <button
              key={p.kind}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm',
                'hover:border-[var(--color-accent-primary,#3b82f6)]/50 hover:bg-white/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)]'
              )}
              onClick={() => addNode(p.kind)}
            >
              <Plus className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={running}
          className={cn(
            'mt-auto flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg',
            'disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
          )}
          onClick={() => void runDemo()}
        >
          <Play className="h-4 w-4" aria-hidden />
          Run (WS demo)
        </button>
      </aside>

      <div className="relative min-h-0 flex-1">
        <LiquidGlassSurface
          variant="frost"
          className="absolute inset-3 overflow-hidden rounded-2xl border border-white/10"
        >
          <div
            className="relative h-full w-full cursor-crosshair bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.12)_1px,transparent_0)] bg-[length:24px_24px]"
            onClick={() => setSelectedId(null)}
            role="presentation"
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {nodes.map((n, i) => {
                const next = nodes[i + 1];
                if (!next) return null;
                return (
                  <line
                    key={`${n.id}-${next.id}`}
                    x1={n.x + 56}
                    y1={n.y + 22}
                    x2={next.x + 56}
                    y2={next.y + 22}
                    stroke="rgba(148,163,184,0.35)"
                    strokeWidth={2}
                  />
                );
              })}
            </svg>

            {nodes.map((n) => {
              const active = n.id === selectedId;
              return (
                <button
                  key={n.id}
                  type="button"
                  style={{ left: n.x, top: n.y }}
                  className={cn(
                    'absolute min-w-[112px] rounded-xl border px-3 py-2 text-left text-sm shadow-lg transition-colors',
                    active
                      ? 'border-[var(--color-accent-primary,#3b82f6)] bg-blue-950/50 ring-2 ring-[var(--color-accent-primary,#3b82f6)]/40'
                      : 'border-white/15 bg-slate-900/80 hover:border-white/25'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(n.id);
                  }}
                >
                  <span className="block text-[10px] uppercase tracking-wide text-white/40">{n.kind}</span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </LiquidGlassSurface>
      </div>

      <aside className="flex w-64 shrink-0 flex-col gap-3 border-l border-white/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Inspector</p>
        {selected ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <div>
              <span className="text-white/45">Id</span>
              <div className="font-mono text-xs text-cyan-200">{selected.id}</div>
            </div>
            <div>
              <span className="text-white/45">Kind</span>
              <div>{selected.kind}</div>
            </div>
            <div>
              <span className="text-white/45">Position</span>
              <div className="font-mono text-xs">
                {selected.x}, {selected.y}
              </div>
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 py-1.5 text-xs text-red-200 hover:bg-red-950/50"
              onClick={removeSelected}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove node
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/40">Select a node on the canvas.</p>
        )}
        <div className="mt-auto max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[10px] text-emerald-200/90">
          {log.length === 0 ? <span className="text-white/35">Stream log…</span> : log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </aside>
    </div>
  );
}
