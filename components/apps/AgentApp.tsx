'use client';

import '@xyflow/react/dist/style.css';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type NodeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type NodeChange,
  type EdgeChange,
  type EdgeProps,
} from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Brain,
  FileSearch,
  GitBranch,
  MessageSquare,
  Pause,
  Play,
  Scale,
  Search,
  Sparkles,
  Square,
  Waypoints,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  useAgentRunner,
  type AgentFlowNode,
  type AgentGraphNodeKind,
  type AgentLogLine,
  type AgentNodeData,
  type NodeRunStatus,
} from '@/hooks/use-agent-runner';

type AgentRunUi = {
  nodeStatuses: Record<string, NodeRunStatus>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  nodeLogs: Record<string, AgentLogLine[]>;
  openLog: (id: string) => void;
};

const AgentRunContext = createContext<AgentRunUi | null>(null);

function useAgentRunUi(): AgentRunUi {
  const v = useContext(AgentRunContext);
  if (!v) throw new Error('AgentRunContext missing');
  return v;
}

const PALETTE: { kind: AgentGraphNodeKind; label: string; icon: LucideIcon }[] = [
  { kind: 'research', label: 'Research', icon: Brain },
  { kind: 'seo', label: 'SEO', icon: Search },
  { kind: 'summarize', label: 'Summarize', icon: Sparkles },
  { kind: 'scrape', label: 'Scrape', icon: FileSearch },
  { kind: 'chat', label: 'Chat', icon: MessageSquare },
  { kind: 'council', label: 'Council', icon: Scale },
  { kind: 'check', label: 'Check', icon: GitBranch },
];

const NODE_STYLE: Record<
  AgentGraphNodeKind,
  { icon: LucideIcon; color: string; bg: string; subtitle: string }
> = {
  start: { icon: Waypoints, color: 'text-emerald-400', bg: 'bg-emerald-400/15', subtitle: 'Entry' },
  end: { icon: Waypoints, color: 'text-rose-400', bg: 'bg-rose-400/15', subtitle: 'Exit' },
  research: {
    icon: Brain,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-400/15',
    subtitle: 'agents.analyze',
  },
  seo: {
    icon: Search,
    color: 'text-amber-400',
    bg: 'bg-amber-400/15',
    subtitle: 'agents.quick_seo',
  },
  summarize: {
    icon: Sparkles,
    color: 'text-sky-400',
    bg: 'bg-sky-400/15',
    subtitle: 'agents.summarize',
  },
  scrape: {
    icon: FileSearch,
    color: 'text-orange-400',
    bg: 'bg-orange-400/15',
    subtitle: 'website_scraper',
  },
  chat: {
    icon: MessageSquare,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/15',
    subtitle: 'chat.completions',
  },
  council: {
    icon: Scale,
    color: 'text-violet-400',
    bg: 'bg-violet-400/15',
    subtitle: 'council.run',
  },
  check: { icon: GitBranch, color: 'text-yellow-400', bg: 'bg-yellow-400/15', subtitle: 'Branch' },
};

function previewFromConfig(data: AgentNodeData): string {
  const c = data.config;
  const bits = [c.url, c.query, c.ifContains].filter(Boolean).map(String);
  const s = bits.join(' · ');
  return s.length > 48 ? s.slice(0, 46) + '…' : s;
}

function AgentNode({ id, data, selected }: NodeProps<AgentFlowNode>) {
  const { nodeStatuses, nodeOutputs, nodeLogs, openLog } = useAgentRunUi();
  const meta = NODE_STYLE[data.kind] ?? NODE_STYLE.research;
  const Icon = meta.icon;
  const preview = previewFromConfig(data);
  const st = nodeStatuses[id];
  const output = nodeOutputs[id];
  const logs = nodeLogs[id] ?? [];
  const latestLog = logs.at(-1) ?? null;

  const isRunning = st === 'running';
  const isSuccess = st === 'success';
  const isError = st === 'error';

  return (
    <div
      className={cn(
        'relative min-w-[168px] max-w-[220px] rounded-xl border p-3 shadow-lg backdrop-blur-md transition-shadow',
        selected
          ? 'border-cyan-500/60 bg-slate-900/95 ring-2 ring-cyan-500/35'
          : 'border-white/10 bg-slate-900/90 hover:border-white/20',
        isSuccess && 'border-emerald-500/50 ring-2 ring-emerald-500/25',
        isError && 'border-red-500/50 ring-2 ring-red-500/25'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!h-2.5 !w-2.5 !border-2 !border-white/30 !bg-slate-800"
      />

      {data.kind === 'check' ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!h-2.5 !w-2.5 !border-2 !border-emerald-400/80 !bg-emerald-950"
            style={{ top: '32%' }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="false"
            className="!h-2.5 !w-2.5 !border-2 !border-red-400/80 !bg-red-950"
            style={{ top: '68%' }}
          />
        </>
      ) : data.kind !== 'end' ? (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!h-2.5 !w-2.5 !border-2 !border-white/30 !bg-slate-800"
        />
      ) : null}

      <div className="flex items-start gap-2">
        <div className={cn('relative rounded-lg border border-white/10 p-2', meta.bg)}>
          <Icon className={cn('h-4 w-4', meta.color)} aria-hidden />
          {isRunning ? (
            <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-cyan-400 ring-2 ring-slate-900" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white/90">{data.label}</p>
          <p className="text-[9px] uppercase tracking-wide text-white/40">{meta.subtitle}</p>
        </div>
      </div>

      {preview ? <p className="mt-1.5 truncate text-[10px] text-white/45">{preview}</p> : null}

      {isRunning && latestLog?.msg ? (
        <p className="mt-1 truncate font-mono text-[9px] text-white/50">{latestLog.msg}</p>
      ) : null}

      {output?.summary != null ? (
        <div className="mt-2 max-h-14 overflow-hidden rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-left">
          <p className="line-clamp-3 font-mono text-[9px] text-emerald-200/90">
            {String(output.summary).slice(0, 180)}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          'nodrag mt-2 flex w-full items-center justify-between rounded-md border px-2 py-1 text-[10px] font-medium transition-colors',
          logs.length > 0
            ? 'border-white/20 bg-white/10 text-white/90 hover:bg-white/15'
            : 'border-white/10 bg-black/30 text-white/40'
        )}
        onClick={(e) => {
          e.stopPropagation();
          openLog(id);
        }}
      >
        <span>logs</span>
        <span className="font-mono text-[9px] opacity-70">
          {logs.length > 0 ? logs.length : '—'}
        </span>
      </button>
    </div>
  );
}

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  label,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const labelText = typeof label === 'string' ? label : undefined;
  const onDelete = (data as { onDelete?: (eid: string) => void } | undefined)?.onDelete;

  return (
    <>
      <BaseEdge path={edgePath} style={style as CSSProperties | undefined} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {labelText ? (
            <span className="rounded border border-white/15 bg-slate-900 px-1 py-0.5 text-[9px] text-white/50">
              {labelText}
            </span>
          ) : null}
          <button
            type="button"
            title="Delete edge"
            className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-slate-800 text-[10px] text-white/50 hover:border-red-400/50 hover:bg-red-950/50 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(id);
            }}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { agentNode: AgentNode };
const edgeTypes = { deletable: DeletableEdge };

function AutoPanner({ statuses }: { statuses: Record<string, NodeRunStatus | undefined> }) {
  const { setCenter, getNode, getZoom } = useReactFlow();
  const prev = useRef<Record<string, NodeRunStatus | undefined>>({});

  useEffect(() => {
    for (const [nid, status] of Object.entries(statuses)) {
      if (status === 'running' && prev.current[nid] !== 'running') {
        const node = getNode(nid);
        if (node) {
          const w = node.measured?.width ?? 180;
          const h = node.measured?.height ?? 120;
          setCenter(node.position.x + w / 2, node.position.y + h / 2, {
            zoom: Math.max(getZoom(), 0.75),
            duration: 350,
          });
        }
      }
    }
    prev.current = { ...statuses };
  }, [statuses, getNode, getZoom, setCenter]);

  return null;
}

function AgentGraphPanel({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelect,
  onEdgeDelete,
  nodeStatuses,
}: {
  nodes: AgentFlowNode[];
  edges: Edge[];
  onNodesChange: (c: NodeChange<AgentFlowNode>[]) => void;
  onEdgesChange: (c: EdgeChange[]) => void;
  onConnect: (c: Connection | Edge) => void;
  onSelect: (id: string) => void;
  onEdgeDelete: (id: string) => void;
  nodeStatuses: Record<string, NodeRunStatus>;
}) {
  const onEdgeDeleteRef = useRef(onEdgeDelete);
  useEffect(() => {
    onEdgeDeleteRef.current = onEdgeDelete;
  }, [onEdgeDelete]);
  const stableOnEdgeDelete = useCallback((eid: string) => onEdgeDeleteRef.current?.(eid), []);

  const mappedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        type: 'deletable' as const,
        data: { onDelete: stableOnEdgeDelete },
        animated: Boolean(e.animated),
      })),
    [edges, stableOnEdgeDelete]
  );

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80">
      <ReactFlow
        nodes={nodes}
        edges={mappedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => onSelect(n.id)}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        colorMode="dark"
        className="bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.1)_1px,transparent_0)] bg-[length:22px_22px]"
        defaultEdgeOptions={{ style: { stroke: 'rgba(34, 211, 238, 0.35)' } }}
      >
        <Background gap={22} size={1} style={{ opacity: 0.05 }} />
        <Controls className="!border-white/10 !bg-slate-900/90" />
        <AutoPanner statuses={nodeStatuses} />
      </ReactFlow>
    </div>
  );
}

function AgentAppShell() {
  const rf = useReactFlow();
  const [logModalId, setLogModalId] = React.useState<string | null>(null);

  const {
    agentsList,
    definitions,
    nodes,
    edges,
    selectedId,
    setSelectedId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgeDelete,
    addNode,
    updateSelectedConfig,
    updateSelectedLabel,
    loadDefinition,
    newCanvas,
    workflowName,
    setWorkflowName,
    selectedWorkflowId,
    saveGraph,
    saving,
    saveError,
    runGraph,
    requestStop,
    togglePause,
    paused,
    running,
    feed,
    nodeStatuses,
    nodeOutputs,
    nodeLogs,
  } = useAgentRunner();

  const runUi = useMemo<AgentRunUi>(
    () => ({
      nodeStatuses,
      nodeOutputs,
      nodeLogs,
      openLog: setLogModalId,
    }),
    [nodeLogs, nodeOutputs, nodeStatuses]
  );

  const addAtCenter = useCallback(
    (kind: AgentGraphNodeKind) => {
      const p = rf.screenToFlowPosition({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
      });
      addNode(kind, p);
    },
    [addNode, rf]
  );

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const handlePauseToggle = useCallback(() => {
    if (!running) return;
    togglePause();
  }, [running, togglePause]);

  return (
    <AgentRunContext.Provider value={runUi}>
      <div className="absolute inset-0 flex flex-col bg-slate-950/95 text-slate-100">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/90">Durgas Agent</p>
              <p className="text-[10px] text-white/45">
                {running ? (paused ? 'Paused between steps' : 'Running…') : 'Idle'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!running}
              onClick={handlePauseToggle}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-40"
            >
              <Pause className="h-3.5 w-3.5" />
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              disabled={!running}
              onClick={requestStop}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950/60 disabled:opacity-40"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => void runGraph()}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-slate-950/80">
            <div className="border-b border-white/10 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Output
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[10px] leading-relaxed text-emerald-200/80">
              {feed.length === 0 ? (
                <span className="text-white/35">Connect nodes from Start, then Run.</span>
              ) : (
                feed.map((l, i) => (
                  <div key={i} className="mb-1 break-all">
                    {l}
                  </div>
                ))
              )}
            </div>
            {agentsList != null ? (
              <div className="max-h-28 shrink-0 overflow-auto border-t border-white/10 p-2 text-[9px] text-white/45">
                <p className="mb-1 font-semibold text-white/55">Backend agents</p>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(agentsList).slice(0, 400)}
                </pre>
              </div>
            ) : null}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-col gap-1 border-b border-white/10 bg-slate-900/50 px-2 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-white/35">
                Add nodes
              </p>
              <div className="flex flex-wrap gap-1">
                {PALETTE.map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    disabled={running}
                    onClick={() => addAtCenter(p.kind)}
                    className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:border-cyan-500/40 hover:bg-white/10 disabled:opacity-40"
                  >
                    <p.icon className="h-3 w-3 shrink-0 opacity-80" />
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving || running || !workflowName.trim()}
                  onClick={() => void saveGraph()}
                  className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10 disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save graph'}
                </button>
                <button
                  type="button"
                  disabled={running}
                  onClick={newCanvas}
                  className="text-[11px] text-white/45 hover:text-white/70 disabled:opacity-40"
                >
                  New canvas
                </button>
                {saveError ? <span className="text-[11px] text-red-300">{saveError}</span> : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 p-2">
              <AgentGraphPanel
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelect={setSelectedId}
                onEdgeDelete={onEdgeDelete}
                nodeStatuses={nodeStatuses}
              />
            </div>
          </div>

          <aside className="flex w-72 shrink-0 flex-col gap-3 border-l border-white/10 bg-slate-950/90 p-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase text-white/45">Flow name</label>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="border-white/10 bg-black/40 text-sm text-white"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] uppercase text-white/45">Saved workflows</p>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {definitions.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => loadDefinition(d.id)}
                    className={cn(
                      'block w-full truncate rounded-md px-2 py-1.5 text-left text-xs',
                      selectedWorkflowId === d.id
                        ? 'bg-cyan-600/25 text-cyan-100'
                        : 'text-white/70 hover:bg-white/10'
                    )}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {selected ? (
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold uppercase text-white/45">
                  Node: {selected.data.kind}
                </p>
                <div>
                  <label className="mb-1 block text-[10px] text-white/45">Label</label>
                  <Input
                    value={selected.data.label}
                    onChange={(e) => updateSelectedLabel(e.target.value)}
                    className="border-white/10 bg-black/40 text-sm text-white"
                  />
                </div>
                {selected.data.kind !== 'start' &&
                selected.data.kind !== 'end' &&
                selected.data.kind !== 'check' ? (
                  <div>
                    <label className="mb-1 block text-[10px] text-white/45">
                      URL (supports {'{{nodeId.summary}}'})
                    </label>
                    <Input
                      value={selected.data.config.url ?? ''}
                      onChange={(e) => updateSelectedConfig({ url: e.target.value })}
                      className="border-white/10 bg-black/40 font-mono text-xs text-white"
                    />
                  </div>
                ) : null}
                {selected.data.kind === 'check' ? (
                  <div>
                    <label className="mb-1 block text-[10px] text-white/45">
                      Branch true if last summary contains
                    </label>
                    <Input
                      value={selected.data.config.ifContains ?? ''}
                      onChange={(e) => updateSelectedConfig({ ifContains: e.target.value })}
                      placeholder="substring (empty = always true)"
                      className="border-white/10 bg-black/40 text-xs text-white"
                    />
                  </div>
                ) : null}
                {(selected.data.kind === 'research' ||
                  selected.data.kind === 'scrape' ||
                  selected.data.kind === 'council' ||
                  selected.data.kind === 'chat') && (
                  <div>
                    <label className="mb-1 block text-[10px] text-white/45">Query / message</label>
                    <textarea
                      value={selected.data.config.query ?? ''}
                      onChange={(e) => updateSelectedConfig({ query: e.target.value })}
                      rows={3}
                      className="w-full resize-none rounded-md border border-white/10 bg-black/40 p-2 text-xs text-white"
                    />
                  </div>
                )}
                {selected.data.kind === 'summarize' ? (
                  <div>
                    <label className="mb-1 block text-[10px] text-white/45">max_length</label>
                    <Input
                      type="number"
                      value={String(selected.data.config.maxLength ?? 500)}
                      onChange={(e) =>
                        updateSelectedConfig({ maxLength: Number(e.target.value) || 500 })
                      }
                      className="border-white/10 bg-black/40 text-xs text-white"
                    />
                  </div>
                ) : null}
                {selected.data.kind === 'chat' ? (
                  <>
                    <div>
                      <label className="mb-1 block text-[10px] text-white/45">
                        Context (optional)
                      </label>
                      <textarea
                        value={selected.data.config.context ?? ''}
                        onChange={(e) => updateSelectedConfig({ context: e.target.value })}
                        rows={2}
                        className="w-full resize-none rounded-md border border-white/10 bg-black/40 p-2 text-xs text-white"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-white/70">
                      <input
                        type="checkbox"
                        checked={Boolean(selected.data.config.useRag)}
                        onChange={(e) => updateSelectedConfig({ useRag: e.target.checked })}
                      />
                      use_rag
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="provider"
                        value={selected.data.config.provider ?? ''}
                        onChange={(e) => updateSelectedConfig({ provider: e.target.value })}
                        className="border-white/10 bg-black/40 text-xs text-white"
                      />
                      <Input
                        placeholder="model"
                        value={selected.data.config.model ?? ''}
                        onChange={(e) => updateSelectedConfig({ model: e.target.value })}
                        className="border-white/10 bg-black/40 text-xs text-white"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-white/40">Select a node to edit its config.</p>
            )}
          </aside>
        </div>

        {logModalId ? (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            role="dialog"
            aria-modal
            onClick={() => setLogModalId(null)}
          >
            <div
              className="max-h-[70vh] w-full max-w-lg overflow-auto rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Node log: {logModalId}</p>
                <button
                  type="button"
                  className="text-white/50 hover:text-white"
                  onClick={() => setLogModalId(null)}
                >
                  ✕
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-emerald-100/90">
                {(nodeLogs[logModalId] ?? []).map((l) => `${l.t} ${l.msg}`).join('\n')}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </AgentRunContext.Provider>
  );
}

export function AgentApp() {
  return (
    <ReactFlowProvider>
      <AgentAppShell />
    </ReactFlowProvider>
  );
}
