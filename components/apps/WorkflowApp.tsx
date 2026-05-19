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
  useReactFlow,
} from '@xyflow/react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Brain, Database, GitBranch, Play, Plus, Share2, Waypoints } from 'lucide-react';

import {
  CREATE_WORKFLOW_DEFINITION,
  START_WORKFLOW_RUN,
  WORKFLOW_DEFINITIONS,
} from '@/lib/graphql-modules';
import { useWorkflowRunner } from '@/hooks/use-workflow';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const SPEC_SCHEMA = 'durgasos.workflow.v1' as const;

export type WfKind = 'start' | 'end' | 'llm' | 'transform' | 'vectordb' | 'kafka';

const PALETTE: { kind: WfKind; label: string }[] = [
  { kind: 'start', label: 'Start' },
  { kind: 'end', label: 'End' },
  { kind: 'llm', label: 'LLM' },
  { kind: 'transform', label: 'Transform' },
  { kind: 'vectordb', label: 'Vector DB' },
  { kind: 'kafka', label: 'Kafka' },
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
};

export type WfNodeData = {
  wfKind: WfKind;
  title: string;
};

export type FlowNode = Node<WfNodeData, 'wfNode'>;

function WfNode({ data, selected }: NodeProps<FlowNode>) {
  const kind = data.wfKind;
  const meta = NODE_META[kind] ?? NODE_META.llm;
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[260px] rounded-xl border p-3 shadow-lg backdrop-blur-md',
        selected
          ? 'border-cyan-500/50 bg-slate-900/95 ring-2 ring-cyan-500/30'
          : 'border-white/10 bg-slate-900/90 hover:border-white/20'
      )}
    >
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
      {kind !== 'end' ? (
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
        {PALETTE.map((p) => (
          <button
            key={p.kind}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-cyan-500/40 hover:bg-white/10"
            onClick={() => addPalette(p.kind)}
          >
            <Plus className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
            {p.label}
          </button>
        ))}
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

      <aside className="flex w-72 shrink-0 flex-col gap-3 border-l border-white/10 p-3">
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
            Save (GraphQL)
          </button>
          <button
            type="button"
            disabled={running || !selectedWorkflowId}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40"
            onClick={() => selectedWorkflowId && onRun(selectedWorkflowId)}
          >
            <Play className="h-4 w-4" aria-hidden />
            Run WS
          </button>
        </div>
        <p className="text-[10px] text-white/40">
          Save creates a new definition. Run uses the selected workflow id with{' '}
          <code className="text-cyan-200/80">workflow.run</code>.
        </p>
        <div className="mt-auto max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/50 p-2 font-mono text-[10px] text-emerald-200/90">
          {log.length === 0 ? (
            <span className="text-white/35">Stream log…</span>
          ) : (
            log.map((l, i) => <div key={i}>{l}</div>)
          )}
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
