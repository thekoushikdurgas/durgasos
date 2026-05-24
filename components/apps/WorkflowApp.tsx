'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useMemo, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  Handle,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useOnSelectionChange,
  useReactFlow,
} from '@xyflow/react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Brain,
  Database,
  GitBranch,
  Globe,
  MessageCircle,
  Play,
  Share2,
  TableProperties,
  UserCheck,
  Waypoints,
} from 'lucide-react';

import {
  CREATE_WORKFLOW_DEFINITION,
  START_WORKFLOW_RUN,
  WORKFLOW_DEFINITIONS,
} from '@/lib/graphql-modules';
import { useWorkflowRunner } from '@/hooks/use-workflow';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const SPEC_SCHEMA = 'durgasos.workflow.v1' as const;

export type WfKind =
  | 'start'
  | 'end'
  | 'llm'
  | 'transform'
  | 'vectordb'
  | 'kafka'
  | 'http'
  | 'dbquery'
  | 'branch'
  | 'human';

const PALETTE: { kind: WfKind; label: string; group: string }[] = [
  { kind: 'start', label: 'Start', group: 'Control' },
  { kind: 'end', label: 'End', group: 'Control' },
  { kind: 'llm', label: 'LLM', group: 'AI' },
  { kind: 'vectordb', label: 'Vector DB', group: 'AI' },
  { kind: 'transform', label: 'Transform', group: 'Data' },
  { kind: 'http', label: 'HTTP Request', group: 'Data' },
  { kind: 'dbquery', label: 'DB Query', group: 'Data' },
  { kind: 'kafka', label: 'Kafka', group: 'Messaging' },
  { kind: 'branch', label: 'Branch', group: 'Control' },
  { kind: 'human', label: 'Human Loop', group: 'Control' },
];

const NODE_META: Record<
  WfKind,
  { icon: typeof Brain; color: string; bg: string; subtitle: string }
> = {
  start: { icon: Waypoints, color: 'text-emerald-400', bg: 'bg-emerald-400/10', subtitle: 'Entry' },
  end: { icon: Waypoints, color: 'text-rose-400', bg: 'bg-rose-400/10', subtitle: 'Exit' },
  llm: { icon: Brain, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', subtitle: 'LLM' },
  transform: {
    icon: GitBranch,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    subtitle: 'Transform',
  },
  vectordb: { icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', subtitle: 'Vector DB' },
  kafka: { icon: Share2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', subtitle: 'Stream' },
  http: { icon: Globe, color: 'text-sky-400', bg: 'bg-sky-400/10', subtitle: 'HTTP' },
  dbquery: {
    icon: TableProperties,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    subtitle: 'SQL',
  },
  branch: {
    icon: MessageCircle,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    subtitle: 'Branch',
  },
  human: { icon: UserCheck, color: 'text-pink-400', bg: 'bg-pink-400/10', subtitle: 'Human loop' },
};

export type WfNodeData = {
  wfKind: WfKind;
  title: string;
  // Per-kind config
  llmConfig?: { model: string; prompt: string; provider: string };
  vectordbConfig?: { collection: string; topK: number };
  kafkaConfig?: { topic: string };
  transformConfig?: { code: string };
  httpConfig?: { method: string; url: string; headers: string };
  dbqueryConfig?: { sql: string; connection: string };
  branchConfig?: { condition: string };
  humanConfig?: { prompt: string; timeoutSec: number };
  // Live execution state
  execStatus?: 'pending' | 'running' | 'done' | 'error';
};

export type FlowNode = Node<WfNodeData, 'wfNode'>;

function WfNode({ data, selected }: NodeProps<FlowNode>) {
  const kind = data.wfKind;
  const meta = NODE_META[kind] ?? NODE_META.llm;
  const Icon = meta.icon;

  const statusRing =
    data.execStatus === 'running'
      ? 'ring-2 ring-yellow-400/60 border-yellow-400/30'
      : data.execStatus === 'done'
        ? 'ring-2 ring-emerald-400/60 border-emerald-400/30'
        : data.execStatus === 'error'
          ? 'ring-2 ring-red-400/60 border-red-400/30'
          : '';

  const statusDot =
    data.execStatus === 'running'
      ? 'bg-yellow-400 animate-pulse'
      : data.execStatus === 'done'
        ? 'bg-emerald-400'
        : data.execStatus === 'error'
          ? 'bg-red-400'
          : null;

  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[260px] rounded-xl border p-3 shadow-lg backdrop-blur-md',
        selected
          ? 'border-cyan-500/50 bg-slate-900/95 ring-2 ring-cyan-500/30'
          : cn('border-white/10 bg-slate-900/90 hover:border-white/20', statusRing)
      )}
    >
      {statusDot && (
        <span
          className={cn('absolute right-2 top-2 h-2 w-2 rounded-full', statusDot)}
          aria-hidden
        />
      )}
      {kind !== 'start' ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-white/30 !bg-slate-800"
        />
      ) : null}
      <div className="flex items-center gap-2">
        <div className={cn('rounded-lg border border-white/10 p-2', meta.bg)}>
          <Icon className={cn('h-4 w-4', meta.color)} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">{data.title}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/40">{meta.subtitle}</p>
        </div>
      </div>
      {/* Branch nodes get true/false output handles */}
      {kind === 'branch' ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: '33%' }}
            className="!h-2.5 !w-2.5 !border-2 !border-emerald-400/70 !bg-emerald-950"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: '67%' }}
            className="!h-2.5 !w-2.5 !border-2 !border-red-400/70 !bg-red-950"
          />
          <div className="mt-1 flex justify-end gap-3 text-[9px] text-white/30">
            <span className="text-emerald-400/60">T</span>
            <span className="text-red-400/60">F</span>
          </div>
        </>
      ) : kind !== 'end' ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-white/30 !bg-slate-800"
        />
      ) : null}
    </div>
  );
}

const nodeTypes = { wfNode: WfNode };

const defaultNodes: FlowNode[] = [
  {
    id: 'n-start',
    type: 'wfNode',
    position: { x: 40, y: 120 },
    data: { wfKind: 'start', title: 'Start' },
  },
  {
    id: 'n-end',
    type: 'wfNode',
    position: { x: 420, y: 120 },
    data: { wfKind: 'end', title: 'End' },
  },
];

const defaultEdges: Edge[] = [];

let nid = 0;

/** Right-panel node config form, shown when a node is selected on the canvas. */
function NodeInspectorPanel({
  selectedNode,
  onUpdateNode,
}: {
  selectedNode: FlowNode | null;
  onUpdateNode: (id: string, patch: Partial<WfNodeData>) => void;
}) {
  if (!selectedNode) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-6 text-center">
          <p className="text-xs text-white/35">Select a node to configure it</p>
        </div>
      </div>
    );
  }

  const { data, id } = selectedNode;
  const kind = data.wfKind;
  const meta = NODE_META[kind];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-3">
      {/* Node identity card */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className={cn('rounded-lg border border-white/10 p-2', meta.bg)}>
          <Icon className={cn('h-4 w-4', meta.color)} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90">{data.title}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/40">{meta.subtitle}</p>
        </div>
      </div>

      {/* Label edit */}
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
          Label
        </label>
        <Input
          value={data.title}
          onChange={(e) => onUpdateNode(id, { title: e.target.value })}
          className="border-white/10 bg-black/30 text-sm text-white"
          placeholder="Node label"
        />
      </div>

      {/* LLM config */}
      {kind === 'llm' && (
        <>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Provider
            </label>
            <Input
              value={data.llmConfig?.provider ?? 'ollama'}
              onChange={(e) =>
                onUpdateNode(id, {
                  llmConfig: {
                    provider: e.target.value,
                    model: data.llmConfig?.model ?? '',
                    prompt: data.llmConfig?.prompt ?? '',
                  },
                })
              }
              className="border-white/10 bg-black/30 text-sm text-white"
              placeholder="ollama / openai / anthropic"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Model
            </label>
            <Input
              value={data.llmConfig?.model ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  llmConfig: {
                    model: e.target.value,
                    provider: data.llmConfig?.provider ?? 'ollama',
                    prompt: data.llmConfig?.prompt ?? '',
                  },
                })
              }
              className="border-white/10 bg-black/30 text-sm text-white"
              placeholder="e.g. llama3.2, gpt-4o"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Prompt template
            </label>
            <textarea
              value={data.llmConfig?.prompt ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  llmConfig: {
                    prompt: e.target.value,
                    model: data.llmConfig?.model ?? '',
                    provider: data.llmConfig?.provider ?? 'ollama',
                  },
                })
              }
              className="h-24 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              placeholder="You are a helpful assistant...\n\n{input}"
            />
          </div>
        </>
      )}

      {/* VectorDB config */}
      {kind === 'vectordb' && (
        <>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Collection
            </label>
            <Input
              value={data.vectordbConfig?.collection ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  vectordbConfig: {
                    collection: e.target.value,
                    topK: data.vectordbConfig?.topK ?? 5,
                  },
                })
              }
              className="border-white/10 bg-black/30 text-sm text-white"
              placeholder="e.g. my-docs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Top-K results
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              value={data.vectordbConfig?.topK ?? 5}
              onChange={(e) =>
                onUpdateNode(id, {
                  vectordbConfig: {
                    topK: Number(e.target.value),
                    collection: data.vectordbConfig?.collection ?? '',
                  },
                })
              }
              className="border-white/10 bg-black/30 text-sm text-white"
            />
          </div>
        </>
      )}

      {/* Kafka config */}
      {kind === 'kafka' && (
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
            Topic
          </label>
          <Input
            value={data.kafkaConfig?.topic ?? ''}
            onChange={(e) => onUpdateNode(id, { kafkaConfig: { topic: e.target.value } })}
            className="border-white/10 bg-black/30 text-sm text-white"
            placeholder="e.g. workflow.run.requested"
          />
        </div>
      )}

      {/* Transform config */}
      {kind === 'transform' && (
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
            Transform code (JS)
          </label>
          <textarea
            value={data.transformConfig?.code ?? ''}
            onChange={(e) => onUpdateNode(id, { transformConfig: { code: e.target.value } })}
            className="h-28 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-emerald-200 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            placeholder={'// input available as `data`\nreturn { ...data, processed: true };'}
          />
        </div>
      )}

      {/* HTTP config */}
      {kind === 'http' && (
        <>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Method
            </label>
            <select
              value={data.httpConfig?.method ?? 'GET'}
              onChange={(e) =>
                onUpdateNode(id, {
                  httpConfig: {
                    method: e.target.value,
                    url: data.httpConfig?.url ?? '',
                    headers: data.httpConfig?.headers ?? '',
                  },
                })
              }
              className="w-full rounded-md border border-white/10 bg-black/30 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              URL
            </label>
            <Input
              value={data.httpConfig?.url ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  httpConfig: {
                    method: data.httpConfig?.method ?? 'GET',
                    url: e.target.value,
                    headers: data.httpConfig?.headers ?? '',
                  },
                })
              }
              className="border-white/10 bg-black/30 font-mono text-xs text-white"
              placeholder="https://api.example.com/v1/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Headers (JSON)
            </label>
            <textarea
              value={data.httpConfig?.headers ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  httpConfig: {
                    method: data.httpConfig?.method ?? 'GET',
                    url: data.httpConfig?.url ?? '',
                    headers: e.target.value,
                  },
                })
              }
              className="h-16 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              placeholder='{"Authorization": "Bearer {{token}}"}'
            />
          </div>
        </>
      )}

      {/* DB Query config */}
      {kind === 'dbquery' && (
        <>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Connection alias
            </label>
            <Input
              value={data.dbqueryConfig?.connection ?? 'postgres'}
              onChange={(e) =>
                onUpdateNode(id, {
                  dbqueryConfig: {
                    connection: e.target.value,
                    sql: data.dbqueryConfig?.sql ?? '',
                  },
                })
              }
              className="border-white/10 bg-black/30 text-sm text-white"
              placeholder="postgres / redis / mysql"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              SQL statement
            </label>
            <textarea
              value={data.dbqueryConfig?.sql ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  dbqueryConfig: {
                    connection: data.dbqueryConfig?.connection ?? 'postgres',
                    sql: e.target.value,
                  },
                })
              }
              className="h-24 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-amber-200 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              placeholder="SELECT * FROM documents WHERE ...;"
            />
          </div>
        </>
      )}

      {/* Branch config */}
      {kind === 'branch' && (
        <>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5">
            <p className="mb-2 text-[10px] text-violet-300/80">
              Connect <span className="font-mono">true</span> handle (top) for the truthy path and
              <span className="font-mono"> false</span> handle (bottom) for the falsy path.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Condition (JS)
            </label>
            <textarea
              value={data.branchConfig?.condition ?? ''}
              onChange={(e) => onUpdateNode(id, { branchConfig: { condition: e.target.value } })}
              className="h-20 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-violet-200 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
              placeholder="// 'data' is the upstream output\nreturn data.score > 0.8;"
            />
          </div>
        </>
      )}

      {/* Human-in-the-loop config */}
      {kind === 'human' && (
        <>
          <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-2.5">
            <p className="text-[10px] text-pink-300/80">
              Pauses the workflow and waits for a human to approve or reject before continuing.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Prompt / instructions
            </label>
            <textarea
              value={data.humanConfig?.prompt ?? ''}
              onChange={(e) =>
                onUpdateNode(id, {
                  humanConfig: {
                    prompt: e.target.value,
                    timeoutSec: data.humanConfig?.timeoutSec ?? 3600,
                  },
                })
              }
              className="h-20 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-pink-500/40"
              placeholder="Please review the generated report and approve to continue."
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
              Timeout (seconds)
            </label>
            <Input
              type="number"
              min={60}
              max={86400}
              value={data.humanConfig?.timeoutSec ?? 3600}
              onChange={(e) =>
                onUpdateNode(id, {
                  humanConfig: {
                    prompt: data.humanConfig?.prompt ?? '',
                    timeoutSec: Number(e.target.value),
                  },
                })
              }
              className="border-white/10 bg-black/30 text-sm text-white"
            />
          </div>
        </>
      )}

      {/* Exec status badge */}
      {data.execStatus && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-xs font-medium',
            data.execStatus === 'running' && 'border-yellow-400/20 bg-yellow-400/5 text-yellow-300',
            data.execStatus === 'done' && 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300',
            data.execStatus === 'error' && 'border-red-400/20 bg-red-400/5 text-red-300',
            data.execStatus === 'pending' && 'border-white/10 bg-white/5 text-white/40'
          )}
        >
          Status: {data.execStatus}
        </div>
      )}
    </div>
  );
}

function FlowWorkspace({
  workflowName,
  setWorkflowName,
  selectedWorkflowId,
  setSelectedWorkflowId,
  onSave,
  onRun,
  saving,
  running,
  log,
  definitions,
  saveError,
}: {
  workflowName: string;
  setWorkflowName: (v: string) => void;
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;
  onSave: (nodes: FlowNode[], edges: Edge[]) => void;
  onRun: (workflowId: string) => void;
  saving: boolean;
  running: boolean;
  log: string[];
  definitions: { id: string; name: string; spec: unknown }[];
  saveError: string | null;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  // Track canvas selection
  useOnSelectionChange({
    onChange: ({ nodes: sel }) => {
      setSelectedNode(sel.length > 0 ? (sel[0] as FlowNode) : null);
    },
  });

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<WfNodeData>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as FlowNode) : n))
      );
      // Keep selectedNode in sync
      setSelectedNode((prev) =>
        prev && prev.id === id ? ({ ...prev, data: { ...prev.data, ...patch } } as FlowNode) : prev
      );
    },
    [setNodes]
  );

  const addPalette = useCallback(
    (kind: WfKind) => {
      nid += 1;
      const id = `n-${kind}-${nid}`;
      const label = PALETTE.find((p) => p.kind === kind)?.label ?? kind;
      const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setNodes((nds) =>
        nds.concat({
          id,
          type: 'wfNode',
          position: { x: pos.x - 100, y: pos.y - 80 },
          data: { wfKind: kind, title: `New ${label}` },
        } as FlowNode)
      );
    },
    [screenToFlowPosition, setNodes]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const loadDefinition = useCallback(
    (id: string | null) => {
      setSelectedWorkflowId(id);
      if (!id) return;
      const def = definitions.find((d) => d.id === id);
      if (!def) return;
      setWorkflowName(def.name);
      const spec = def.spec;
      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return;
      const s = spec as Record<string, unknown>;
      if (s.schema !== SPEC_SCHEMA && s.schema !== undefined) {
        /* still try nodes/edges */
      }
      const rawNodes = s.nodes;
      const rawEdges = s.edges;
      if (Array.isArray(rawNodes) && rawNodes.length > 0) {
        const normalized: FlowNode[] = (rawNodes as Node[]).map((n) => {
          const d = (n.data ?? {}) as Partial<WfNodeData>;
          const wfKind = (d.wfKind as WfKind | undefined) ?? 'llm';
          return {
            ...n,
            type: 'wfNode',
            position: n.position ?? { x: 0, y: 0 },
            data: {
              wfKind,
              title: d.title ?? String(n.id),
            },
          } as FlowNode;
        });
        setNodes(normalized);
        setEdges(Array.isArray(rawEdges) ? (rawEdges as Edge[]) : []);
      }
    },
    [definitions, setEdges, setNodes, setWorkflowName, setSelectedWorkflowId]
  );

  return (
    <div className="absolute inset-0 flex bg-slate-950/95 text-slate-100">
      <aside className="flex w-52 shrink-0 flex-col gap-2 border-r border-white/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Palette</p>
        {/* Group palette by category */}
        {['Control', 'AI', 'Data', 'Messaging'].map((group) => {
          const items = PALETTE.filter((p) => p.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                {group}
              </p>
              <div className="space-y-1">
                {items.map((p) => {
                  const meta = NODE_META[p.kind];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={p.kind}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-cyan-500/40 hover:bg-white/10"
                      onClick={() => addPalette(p.kind)}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} aria-hidden />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase text-white/40">Saved</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
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
          <button
            type="button"
            className="mt-2 w-full text-[11px] text-white/45 hover:text-white/70"
            onClick={() => {
              setSelectedWorkflowId(null);
              setWorkflowName(`Workflow ${new Date().toISOString().slice(0, 16)}`);
              setNodes(defaultNodes);
              setEdges(defaultEdges);
            }}
          >
            New canvas
          </button>
        </div>
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
          className="bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.12)_1px,transparent_0)] bg-[length:24px_24px]"
          defaultEdgeOptions={{ style: { stroke: 'rgba(34, 211, 238, 0.45)' } }}
        >
          <Background gap={24} size={1} style={{ opacity: 0.06 }} />
          <Controls className="!border-white/10 !bg-slate-900/90" />
        </ReactFlow>
      </div>

      <aside className="flex w-72 shrink-0 flex-col border-l border-white/10">
        {/* Inspector panel fills top portion */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            Inspector
          </p>
          <NodeInspectorPanel selectedNode={selectedNode} onUpdateNode={onUpdateNode} />
        </div>

        {/* Controls section — workflow name, save/run, log */}
        <div className="shrink-0 border-t border-white/10 p-3 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase text-white/45">Workflow name</label>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="border-white/10 bg-black/30 text-sm text-white"
            />
          </div>
          {saveError ? <p className="text-xs text-red-300">{saveError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !workflowName.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              onClick={() => onSave(nodes, edges)}
            >
              Save
            </button>
            <button
              type="button"
              disabled={running || !selectedWorkflowId}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40"
              onClick={() => selectedWorkflowId && onRun(selectedWorkflowId)}
            >
              <Play className="h-4 w-4" aria-hidden />
              Run
            </button>
          </div>
          <div className="max-h-36 overflow-auto rounded-lg border border-white/10 bg-black/50 p-2 font-mono text-[10px] text-emerald-200/90">
            {log.length === 0 ? (
              <span className="text-white/35">Stream log…</span>
            ) : (
              log.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function WorkflowAppInner() {
  const { data, refetch } = useQuery(WORKFLOW_DEFINITIONS);
  const [createWf] = useMutation(CREATE_WORKFLOW_DEFINITION);
  const [startRun] = useMutation(START_WORKFLOW_RUN);
  const { runWorkflow } = useWorkflowRunner();

  const definitions = useMemo(() => data?.workflowDefinitions ?? [], [data?.workflowDefinitions]);

  const [workflowName, setWorkflowName] = useState(
    `Workflow ${new Date().toISOString().slice(0, 16)}`
  );
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (nodes: FlowNode[], edges: Edge[]) => {
      setSaveError(null);
      setSaving(true);
      try {
        const spec = {
          schema: SPEC_SCHEMA,
          version: 1,
          nodes,
          edges,
        };
        const result = await createWf({
          variables: { name: workflowName.trim() || 'Untitled', spec },
        });
        if (result.error) {
          setSaveError(result.error.message);
          return;
        }
        const created = result.data?.createWorkflowDefinition;
        if (created?.id) {
          setSelectedWorkflowId(String(created.id));
        }
        await refetch();
        setLog((l) => [...l, `saved: ${JSON.stringify(created)}`]);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [createWf, workflowName, refetch]
  );

  const handleRun = useCallback(
    async (workflowId: string) => {
      setRunning(true);
      setLog([]);
      try {
        await startRun({ variables: { workflowId } });
        await runWorkflow(workflowId, {
          onMessage: (msg) => setLog((l) => [...l, JSON.stringify(msg)]),
          onDone: (summary) => setLog((l) => [...l, `done: ${JSON.stringify(summary)}`]),
          onError: (err) => setLog((l) => [...l, `error: ${err}`]),
        });
      } catch (e) {
        setLog((l) => [...l, `catch: ${e instanceof Error ? e.message : String(e)}`]);
      } finally {
        setRunning(false);
      }
    },
    [runWorkflow, startRun]
  );

  return (
    <FlowWorkspace
      workflowName={workflowName}
      setWorkflowName={setWorkflowName}
      selectedWorkflowId={selectedWorkflowId}
      setSelectedWorkflowId={setSelectedWorkflowId}
      onSave={handleSave}
      onRun={handleRun}
      saving={saving}
      running={running}
      log={log}
      definitions={definitions}
      saveError={saveError}
    />
  );
}

export function WorkflowApp() {
  return (
    <ReactFlowProvider>
      <WorkflowAppInner />
    </ReactFlowProvider>
  );
}
