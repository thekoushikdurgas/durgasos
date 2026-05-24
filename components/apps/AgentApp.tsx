'use client';

import '@xyflow/react/dist/style.css';

import React, { createContext, useCallback, useContext, useMemo, type CSSProperties } from 'react';
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getSmoothStepPath,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import {
  Bot,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Code2,
  Compass,
  FileCode2,
  FileInput,
  FileSearch,
  FolderOpen,
  GitBranch,
  Hand,
  ListRestart,
  Monitor,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  SquareTerminal,
  Square,
  Trash2,
  Wand2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  ORBIT_NODE_TYPES,
  ORBIT_TEMPLATES,
  type OrbitFlowEdge,
  type OrbitFlowNode,
  type OrbitLogLine,
  type OrbitNodeType,
  type OrbitRunStatus,
  useOrbitAgentRunner,
} from '@/hooks/use-orbit-agent-runner';

type OrbitUiContextValue = {
  nodeStatuses: Record<string, OrbitRunStatus>;
  nodeLogs: Record<string, OrbitLogLine[]>;
  openLog: (id: string) => void;
};

const OrbitUiContext = createContext<OrbitUiContextValue | null>(null);

function useOrbitUi() {
  const value = useContext(OrbitUiContext);
  if (!value) throw new Error('OrbitUiContext missing');
  return value;
}

const TYPE_META: Record<
  OrbitNodeType,
  { icon: LucideIcon; color: string; bg: string; subtitle: string }
> = {
  Navigate: {
    icon: Compass,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    subtitle: 'Open URL',
  },
  Do: { icon: Wand2, color: 'text-blue-500', bg: 'bg-blue-500/10', subtitle: 'Browser action' },
  Check: { icon: GitBranch, color: 'text-amber-500', bg: 'bg-amber-500/10', subtitle: 'Branch' },
  Fill: {
    icon: FileInput,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    subtitle: 'Form fill',
  },
  Read: { icon: FileSearch, color: 'text-cyan-500', bg: 'bg-cyan-500/10', subtitle: 'Extract' },
  Code: { icon: Code2, color: 'text-slate-500', bg: 'bg-slate-500/10', subtitle: 'Python' },
  Agent: { icon: Bot, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', subtitle: 'Custom verb' },
  ForEach: {
    icon: ListRestart,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    subtitle: 'Loop',
  },
  Bootstrap: { icon: Boxes, color: 'text-stone-500', bg: 'bg-stone-500/10', subtitle: 'Packages' },
};

const STATUS_DOT: Record<OrbitRunStatus, string> = {
  idle: 'bg-slate-300',
  running: 'animate-pulse bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
};

function configPreview(node: OrbitFlowNode): string {
  const cfg = node.data.config ?? {};
  const raw =
    cfg.target ??
    cfg.task ??
    cfg.condition ??
    cfg.items_expr ??
    cfg.code ??
    cfg.class_name ??
    cfg.packages ??
    '';
  const text = String(raw).replace(/\s+/g, ' ').trim();
  return text.length > 58 ? `${text.slice(0, 56)}...` : text;
}

function OrbitNode({ id, data, selected }: NodeProps<OrbitFlowNode>) {
  const { nodeStatuses, nodeLogs, openLog } = useOrbitUi();
  const meta = TYPE_META[data.nodeType];
  const Icon = meta.icon;
  const status = nodeStatuses[id] ?? 'idle';
  const logs = nodeLogs[id] ?? [];
  const preview = configPreview({ id, data, position: { x: 0, y: 0 }, type: 'orbitNode' });

  return (
    <div
      className={cn(
        'relative min-w-[184px] max-w-[244px] rounded-lg border bg-white p-3 text-slate-950 shadow-sm transition',
        selected
          ? 'border-slate-950 ring-2 ring-slate-950/10'
          : 'border-slate-200 hover:border-slate-300',
        status === 'success' && 'border-emerald-400 ring-2 ring-emerald-500/15',
        status === 'error' && 'border-red-400 ring-2 ring-red-500/15'
      )}
    >
      <Handle
        type="target"
        id="handle-in"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-slate-400 !bg-white"
      />
      {data.nodeType === 'Check' ? (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Right}
            style={{ top: '34%' }}
            className="!h-2.5 !w-2.5 !border-emerald-500 !bg-white"
          />
          <Handle
            type="source"
            id="false"
            position={Position.Right}
            style={{ top: '70%' }}
            className="!h-2.5 !w-2.5 !border-red-500 !bg-white"
          />
        </>
      ) : data.nodeType === 'ForEach' ? (
        <>
          <Handle
            type="source"
            id="handle-out"
            position={Position.Right}
            style={{ top: '34%' }}
            className="!h-2.5 !w-2.5 !border-blue-500 !bg-white"
          />
          <Handle
            type="source"
            id="handle-foreach-done"
            position={Position.Right}
            style={{ top: '70%' }}
            className="!h-2.5 !w-2.5 !border-orange-500 !bg-white"
          />
        </>
      ) : (
        <Handle
          type="source"
          id="handle-out"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-slate-400 !bg-white"
        />
      )}

      <div className="flex items-start gap-2">
        <div className={cn('relative rounded-md border border-slate-200 p-2', meta.bg)}>
          <Icon className={cn('h-4 w-4', meta.color)} aria-hidden />
          <span
            className={cn(
              'absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white',
              STATUS_DOT[status]
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-950">{data.label}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{meta.subtitle}</p>
        </div>
      </div>

      {preview ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-500">{preview}</p>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openLog(id);
        }}
        className="nodrag mt-3 flex w-full items-center justify-between rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
      >
        <span>Logs</span>
        <span className="font-mono">{logs.length}</span>
      </button>
    </div>
  );
}

function OrbitEdge({
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
  const onDelete = (data as { onDelete?: (id: string) => void } | undefined)?.onDelete;

  return (
    <>
      <BaseEdge path={edgePath} style={style as CSSProperties | undefined} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan flex items-center gap-1"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {typeof label === 'string' ? (
            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm">
              {label}
            </span>
          ) : null}
          <button
            type="button"
            title="Delete edge"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:border-red-300 hover:text-red-500"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(id);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { orbitNode: OrbitNode };
const edgeTypes = { orbitEdge: OrbitEdge };

function OrbitCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelect,
  onEdgeDelete,
}: {
  nodes: OrbitFlowNode[];
  edges: OrbitFlowEdge[];
  onNodesChange: (changes: NodeChange<OrbitFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection | Edge) => void;
  onSelect: (id: string) => void;
  onEdgeDelete: (id: string) => void;
}) {
  const mappedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: 'orbitEdge',
        data: { ...(edge.data ?? { orbitType: 'sequential' as const }), onDelete: onEdgeDelete },
        style: {
          stroke: edge.data?.orbitType === 'loop_back' ? '#f59e0b' : '#64748b',
          strokeWidth: 1.6,
        },
      })),
    [edges, onEdgeDelete]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={mappedEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => onSelect(node.id)}
      deleteKeyCode={['Delete', 'Backspace']}
      fitView
      className="bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.10)_1px,transparent_0)] bg-[length:22px_22px]"
      defaultEdgeOptions={{ type: 'orbitEdge' }}
    >
      <Background gap={22} size={1} />
      <Controls className="!border-slate-200 !bg-white" />
    </ReactFlow>
  );
}

function WorkflowSelector({
  definitions,
  selectedWorkflowId,
  workflowName,
  setWorkflowName,
  onSelect,
  onNew,
}: {
  definitions: Array<{ id: string; name: string }>;
  selectedWorkflowId: string | null;
  workflowName: string;
  setWorkflowName: (value: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white"
      >
        <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="truncate text-sm font-semibold text-slate-950">
          {workflowName || 'Untitled'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      <Input
        value={workflowName}
        onChange={(event) => setWorkflowName(event.target.value)}
        className="h-8 w-48 border-slate-200 bg-white text-xs text-slate-900"
      />
      <button
        type="button"
        title="New workflow"
        onClick={onNew}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute left-3 top-11 z-40 max-h-64 w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          {definitions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No saved Orbit workflows yet.</p>
          ) : (
            definitions.map((definition) => (
              <button
                key={definition.id}
                type="button"
                onClick={() => {
                  onSelect(definition.id);
                  setOpen(false);
                }}
                className={cn(
                  'block w-full truncate rounded-md px-3 py-2 text-left text-xs',
                  selectedWorkflowId === definition.id
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {definition.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function GlobalConfigBar({
  llm,
  humanInLoop,
  onLlm,
  onHumanInLoop,
}: {
  llm: string;
  humanInLoop: boolean;
  onLlm: (value: string) => void;
  onHumanInLoop: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Global</span>
      <Input
        value={llm}
        onChange={(event) => onLlm(event.target.value)}
        className="h-8 w-56 border-slate-200 text-xs"
      />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={humanInLoop}
          onChange={(event) => onHumanInLoop(event.target.checked)}
        />
        Human review
      </label>
    </div>
  );
}

function Toolbar({
  onAddNode,
  onSave,
  onPreview,
  onRun,
  running,
  status,
}: {
  onAddNode: (type: OrbitNodeType, position: { x: number; y: number }) => void;
  onSave: () => void;
  onPreview: () => void;
  onRun: () => void;
  running: boolean;
  status: string;
}) {
  const rf = useReactFlow();
  const addAtCenter = useCallback(
    (type: OrbitNodeType) => {
      const p = rf.screenToFlowPosition({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 320,
      });
      onAddNode(type, p);
    },
    [onAddNode, rf]
  );

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Nodes</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={onPreview}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            <FileCode2 className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            type="button"
            disabled={running}
            onClick={onRun}
            className="flex items-center gap-1 rounded-md bg-slate-950 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {ORBIT_NODE_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => addAtCenter(type)}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
            >
              <Icon className={cn('h-3.5 w-3.5', meta.color)} />
              {type}
            </button>
          );
        })}
        <span className="ml-auto truncate text-[11px] text-slate-500">{status}</span>
      </div>
    </div>
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full resize-none rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none focus:border-slate-400',
        mono && 'font-mono'
      )}
    />
  );
}

function JsonTextArea({
  value,
  onValid,
  rows = 5,
}: {
  value: unknown;
  onValid: (value: unknown) => void;
  rows?: number;
}) {
  const [draft, setDraft] = React.useState(() => JSON.stringify(value, null, 2));
  const [valid, setValid] = React.useState(true);

  return (
    <textarea
      value={draft}
      rows={rows}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        try {
          onValid(JSON.parse(next));
          setValid(true);
        } catch {
          setValid(false);
        }
      }}
      className={cn(
        'w-full resize-none rounded-md border bg-white p-2 font-mono text-xs text-slate-900 outline-none focus:border-slate-400',
        valid ? 'border-slate-200' : 'border-red-300'
      )}
    />
  );
}

function ConfigPanel({
  node,
  updateSelected,
  updateSelectedConfig,
  deleteSelectedNode,
}: {
  node: OrbitFlowNode | null;
  updateSelected: (patch: Partial<OrbitFlowNode['data']>) => void;
  updateSelectedConfig: (patch: Record<string, unknown>) => void;
  deleteSelectedNode: () => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-xs text-slate-400">
        Select a node to edit its configuration.
      </div>
    );
  }

  const cfg = node.data.config ?? {};
  const get = (key: string) => (cfg[key] == null ? '' : String(cfg[key]));
  const setNumber = (key: string, value: string) =>
    updateSelectedConfig({ [key]: value.trim() ? Number(value) : null });

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-1 text-[10px] font-bold text-white',
              TYPE_META[node.data.nodeType].color.replace('text-', 'bg-')
            )}
          >
            {node.data.nodeType}
          </span>
          <p className="mt-1 font-mono text-[10px] text-slate-400">{node.id}</p>
        </div>
        <button
          type="button"
          onClick={deleteSelectedNode}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-500 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Label
        </span>
        <Input
          value={node.data.label}
          onChange={(event) => updateSelected({ label: event.target.value })}
          className="h-8 border-slate-200 text-xs"
        />
      </label>

      {node.data.nodeType === 'Navigate' ? (
        <label className="mb-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Target URL
          </span>
          <Input
            value={get('target')}
            onChange={(event) => updateSelectedConfig({ target: event.target.value })}
            className="h-8 border-slate-200 text-xs"
          />
        </label>
      ) : null}

      {node.data.nodeType === 'Do' || node.data.nodeType === 'Read' ? (
        <label className="mb-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Task
          </span>
          <TextArea
            value={get('task')}
            onChange={(value) => updateSelectedConfig({ task: value })}
            rows={4}
          />
        </label>
      ) : null}

      {node.data.nodeType === 'Check' ? (
        <label className="mb-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Condition
          </span>
          <TextArea
            value={get('condition')}
            onChange={(value) => updateSelectedConfig({ condition: value })}
            rows={4}
          />
        </label>
      ) : null}

      {node.data.nodeType === 'Fill' ? (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Form target
            </span>
            <TextArea
              value={get('target')}
              onChange={(value) => updateSelectedConfig({ target: value })}
              rows={3}
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Data JSON
            </span>
            <JsonTextArea
              key={`${node.id}-data`}
              value={cfg.data ?? {}}
              onValid={(value) => updateSelectedConfig({ data: value })}
            />
          </label>
        </>
      ) : null}

      {node.data.nodeType === 'Code' ? (
        <label className="mb-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Python code
          </span>
          <TextArea
            value={get('code')}
            onChange={(value) => updateSelectedConfig({ code: value })}
            rows={8}
            mono
          />
        </label>
      ) : null}

      {node.data.nodeType === 'ForEach' ? (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Items expression
            </span>
            <TextArea
              value={get('items_expr')}
              onChange={(value) => updateSelectedConfig({ items_expr: value })}
              rows={4}
              mono
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Loop variable
            </span>
            <Input
              value={get('loop_var')}
              onChange={(event) => updateSelectedConfig({ loop_var: event.target.value })}
              className="h-8 border-slate-200 text-xs"
            />
          </label>
        </>
      ) : null}

      {node.data.nodeType === 'Agent' ? (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Class name
            </span>
            <Input
              value={get('class_name')}
              onChange={(event) => updateSelectedConfig({ class_name: event.target.value })}
              className="h-8 border-slate-200 text-xs"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Task
            </span>
            <Input
              value={get('task')}
              onChange={(event) => updateSelectedConfig({ task: event.target.value })}
              className="h-8 border-slate-200 text-xs"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Prompt template
            </span>
            <TextArea
              value={get('prompt_template')}
              onChange={(value) => updateSelectedConfig({ prompt_template: value })}
              rows={5}
            />
          </label>
        </>
      ) : null}

      {node.data.nodeType === 'Bootstrap' ? (
        <label className="mb-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Packages
          </span>
          <TextArea
            value={get('packages')}
            onChange={(value) => updateSelectedConfig({ packages: value })}
            rows={5}
            mono
          />
        </label>
      ) : null}

      {node.data.nodeType !== 'Code' &&
      node.data.nodeType !== 'ForEach' &&
      node.data.nodeType !== 'Bootstrap' ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Advanced
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-[10px] text-slate-400">Max steps</span>
              <Input
                value={get('max_steps')}
                onChange={(event) => setNumber('max_steps', event.target.value)}
                className="h-8 border-slate-200 text-xs"
              />
            </label>
            <label>
              <span className="mb-1 block text-[10px] text-slate-400">Timeout</span>
              <Input
                value={get('timeout')}
                onChange={(event) => setNumber('timeout', event.target.value)}
                className="h-8 border-slate-200 text-xs"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[10px] text-slate-400">LLM override</span>
            <Input
              value={get('llm')}
              onChange={(event) => updateSelectedConfig({ llm: event.target.value || null })}
              className="h-8 border-slate-200 text-xs"
            />
          </label>
          {node.data.nodeType === 'Do' || node.data.nodeType === 'Navigate' ? (
            <label className="mt-3 block">
              <span className="mb-1 block text-[10px] text-slate-400">Extra info</span>
              <TextArea
                value={get('extra_info')}
                onChange={(value) => updateSelectedConfig({ extra_info: value })}
                rows={3}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {node.data.nodeType === 'Read' ||
      node.data.nodeType === 'Do' ||
      node.data.nodeType === 'Agent' ? (
        <label className="mt-4 block border-t border-slate-200 pt-3">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Output schema fields JSON
          </span>
          <JsonTextArea
            key={`${node.id}-schema`}
            value={node.data.output_schema?.fields ?? []}
            onValid={(fields) =>
              updateSelected({
                output_schema: Array.isArray(fields) && fields.length ? { fields } : null,
              })
            }
          />
        </label>
      ) : null}
    </div>
  );
}

function DesktopPanel({
  paused,
  running,
  togglePause,
  requestStop,
}: {
  paused: boolean;
  running: boolean;
  togglePause: () => void;
  requestStop: () => void;
}) {
  const base =
    process.env.NEXT_PUBLIC_ORBIT_VNC_URL?.trim() ||
    'http://127.0.0.1:6080/vnc.html?autoconnect=true&resize=scale';
  const src = `${base}${base.includes('?') ? '&' : '?'}view_only=${paused ? '0' : '1'}`;
  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              paused ? 'bg-amber-500' : running ? 'bg-emerald-500' : 'bg-slate-300'
            )}
          />
          <div>
            <p className="text-xs font-semibold text-slate-950">
              {paused ? "You're in control" : running ? 'Agent running' : 'Idle'}
            </p>
            <p className="text-[10px] text-slate-400">
              {paused ? 'Desktop accepts input' : 'Desktop is view-only'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePause}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
            {paused ? 'Hand Back' : 'Take Over'}
          </button>
          <button
            type="button"
            disabled={!running}
            onClick={requestStop}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        </div>
      </div>
      <iframe title="Orbit desktop" src={src} className="min-h-0 flex-1 border-0 bg-slate-950" />
    </div>
  );
}

function BottomPanel({
  previewCode,
  feed,
  runs,
}: {
  previewCode: string;
  feed: string[];
  runs: Array<{ id: string; status: string; createdAt?: string; updatedAt?: string }>;
}) {
  const [tab, setTab] = React.useState<'preview' | 'runs' | 'feed'>('preview');
  return (
    <div className="flex h-44 shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-slate-800 bg-slate-900 px-2">
        {(['preview', 'runs', 'feed'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              'rounded px-2 py-1 text-[11px] capitalize',
              tab === item ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {item === 'preview' ? 'workflow.py' : item}
          </button>
        ))}
      </div>
      {tab === 'preview' ? (
        <pre className="m-0 min-h-0 flex-1 overflow-auto p-3 font-mono text-[10px] leading-relaxed text-slate-200">
          {previewCode}
        </pre>
      ) : tab === 'runs' ? (
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {runs.length ? (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-2 rounded px-2 py-1 font-mono text-[10px] text-slate-300 hover:bg-slate-900"
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    run.status === 'running'
                      ? 'bg-blue-400'
                      : run.status === 'error'
                        ? 'bg-red-400'
                        : 'bg-emerald-400'
                  )}
                />
                <span className="flex-1">{run.status}</span>
                <span className="text-slate-500">{run.id.slice(0, 8)}</span>
              </div>
            ))
          ) : (
            <p className="p-3 text-xs text-slate-500">No runs yet.</p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[10px] leading-relaxed text-emerald-200">
          {feed.length ? (
            feed.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
          ) : (
            <span className="text-slate-500">No events yet.</span>
          )}
        </div>
      )}
    </div>
  );
}

function TemplatePicker({ onLoad }: { onLoad: (name: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {ORBIT_TEMPLATES.map((template) => (
        <button
          key={template.name}
          type="button"
          onClick={() => onLoad(template.name)}
          className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-950"
        >
          <p className="text-xs font-semibold text-slate-950">{template.name}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">{template.desc}</p>
        </button>
      ))}
    </div>
  );
}

function DocsPanel() {
  return (
    <div className="h-full overflow-auto bg-white p-6 text-sm text-slate-700">
      <h2 className="text-lg font-semibold text-slate-950">Orbit workflow model</h2>
      <p className="mt-2 max-w-3xl">
        Durgas Agent now stores Orbit-shaped graphs in ai.backend and asks ai.backend to compile the
        graph into workflow.py. Runs go through the existing ai.backend workflow channel.
      </p>
      <div className="mt-6 grid max-w-4xl grid-cols-2 gap-3">
        {ORBIT_NODE_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          return (
            <div key={type} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', meta.color)} />
                <span className="text-sm font-semibold text-slate-950">{type}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{meta.subtitle}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogModal({
  nodeId,
  logs,
  onClose,
}: {
  nodeId: string;
  logs: OrbitLogLine[];
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="font-mono text-xs text-slate-300">node log: {nodeId}</p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="m-0 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-emerald-100">
          {logs.length
            ? logs.map((log) => `${log.t} ${log.msg}`).join('\n')
            : 'No logs for this node yet.'}
        </pre>
      </div>
    </div>
  );
}

function AgentAppShell() {
  const [activeTab, setActiveTab] = React.useState<'Tasks' | 'Desktop' | 'Docs'>('Desktop');
  const [logModalId, setLogModalId] = React.useState<string | null>(null);
  const runner = useOrbitAgentRunner();

  const ui = useMemo(
    () => ({
      nodeStatuses: runner.nodeStatuses,
      nodeLogs: runner.nodeLogs,
      openLog: setLogModalId,
    }),
    [runner.nodeLogs, runner.nodeStatuses]
  );

  return (
    <OrbitUiContext.Provider value={ui}>
      <div className="absolute inset-0 flex flex-col bg-slate-100 text-slate-950">
        <header className="flex h-11 shrink-0 items-center border-b border-slate-200 bg-white px-4">
          <div className="mr-6 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Durgas Agent</span>
          </div>
          <div className="flex h-full items-center gap-1">
            {(['Tasks', 'Desktop', 'Docs'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium',
                  activeTab === tab
                    ? 'border-slate-950 text-slate-950'
                    : 'border-transparent text-slate-500 hover:text-slate-950'
                )}
              >
                {tab === 'Tasks' ? (
                  <SquareTerminal className="h-3.5 w-3.5" />
                ) : tab === 'Desktop' ? (
                  <Monitor className="h-3.5 w-3.5" />
                ) : (
                  <FileCode2 className="h-3.5 w-3.5" />
                )}
                {tab}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{runner.status}</span>
            {runner.running ? <RefreshCw className="h-4 w-4 animate-spin text-blue-500" /> : null}
          </div>
        </header>

        {activeTab === 'Docs' ? (
          <DocsPanel />
        ) : (
          <div className="flex min-h-0 flex-1">
            <section
              className={cn(
                'min-w-0 flex-1 border-r border-slate-200',
                activeTab === 'Tasks' && 'hidden'
              )}
            >
              <DesktopPanel
                paused={runner.paused}
                running={runner.running}
                togglePause={runner.togglePause}
                requestStop={runner.requestStop}
              />
            </section>

            <section
              className={cn(
                'flex min-w-[420px] flex-col bg-white',
                activeTab === 'Tasks' ? 'w-full' : 'w-[48%] max-w-[760px]'
              )}
            >
              <WorkflowSelector
                definitions={runner.definitions.map((definition) => ({
                  id: String(definition.id),
                  name: definition.name,
                }))}
                selectedWorkflowId={runner.selectedWorkflowId}
                workflowName={runner.workflowName}
                setWorkflowName={runner.setWorkflowName}
                onSelect={runner.loadDefinition}
                onNew={runner.newWorkflow}
              />
              <GlobalConfigBar
                llm={runner.globalConfig.llm}
                humanInLoop={runner.globalConfig.human_in_the_loop}
                onLlm={(llm) => runner.setGlobalConfig({ ...runner.globalConfig, llm })}
                onHumanInLoop={(human_in_the_loop) =>
                  runner.setGlobalConfig({ ...runner.globalConfig, human_in_the_loop })
                }
              />
              <Toolbar
                onAddNode={runner.addNode}
                onSave={() => void runner.saveGraph()}
                onPreview={() => void runner.generatePreview()}
                onRun={() => void runner.runGraph()}
                running={runner.running}
                status={runner.status}
              />
              <TemplatePicker onLoad={runner.loadTemplate} />
              <div className="flex min-h-0 flex-1 border-t border-slate-200">
                <div className="min-w-0 flex-1 p-3">
                  <div className="h-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <OrbitCanvas
                      nodes={runner.nodes}
                      edges={runner.edges}
                      onNodesChange={runner.onNodesChange}
                      onEdgesChange={runner.onEdgesChange}
                      onConnect={runner.onConnect}
                      onSelect={runner.setSelectedId}
                      onEdgeDelete={runner.onEdgeDelete}
                    />
                  </div>
                </div>
                <aside className="w-72 shrink-0 border-l border-slate-200">
                  <ConfigPanel
                    node={runner.selectedNode}
                    updateSelected={runner.updateSelected}
                    updateSelectedConfig={runner.updateSelectedConfig}
                    deleteSelectedNode={runner.deleteSelectedNode}
                  />
                </aside>
              </div>
              <div className="p-3 pt-0">
                <BottomPanel
                  previewCode={runner.previewCode}
                  feed={runner.feed}
                  runs={runner.runs}
                />
              </div>
            </section>
          </div>
        )}

        {logModalId ? (
          <LogModal
            nodeId={logModalId}
            logs={runner.nodeLogs[logModalId] ?? []}
            onClose={() => setLogModalId(null)}
          />
        ) : null}

        <div className="pointer-events-none absolute left-3 top-14 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] text-slate-500 shadow-sm">
          {runner.running ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          ) : runner.status.toLowerCase().includes('error') ? (
            <XCircle className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Pause className="h-3.5 w-3.5 text-slate-400" />
          )}
          ai.backend: GraphQL + WebSocket
        </div>
      </div>
    </OrbitUiContext.Provider>
  );
}

export function AgentApp() {
  return (
    <ReactFlowProvider>
      <AgentAppShell />
    </ReactFlowProvider>
  );
}
