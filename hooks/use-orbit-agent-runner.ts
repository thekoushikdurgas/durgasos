'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';

import {
  CREATE_WORKFLOW_DEFINITION,
  START_WORKFLOW_RUN,
  WORKFLOW_DEFINITIONS,
  WORKFLOW_RUNS,
} from '@/lib/graphql-modules';
import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';

export const ORBIT_SPEC_SCHEMA = 'durgasos.orbit.workflow.v1' as const;

export type OrbitNodeType =
  | 'Navigate'
  | 'Do'
  | 'Check'
  | 'Fill'
  | 'Read'
  | 'Code'
  | 'Agent'
  | 'ForEach'
  | 'Bootstrap';

export type OrbitEdgeType =
  | 'sequential'
  | 'conditional_true'
  | 'conditional_false'
  | 'loop_back'
  | 'foreach_done';

export type OrbitNodeConfig = Record<string, unknown>;

export type OrbitOutputSchema = {
  fields: Array<{ name: string; type: string }>;
} | null;

export type OrbitNodeData = {
  nodeType: OrbitNodeType;
  label: string;
  config: OrbitNodeConfig;
  output_schema?: OrbitOutputSchema;
};

export type OrbitFlowNode = Node<OrbitNodeData, 'orbitNode'>;
export type OrbitFlowEdge = Edge<{ orbitType: OrbitEdgeType; onDelete?: (id: string) => void }>;

export type OrbitGraph = {
  schema: typeof ORBIT_SPEC_SCHEMA;
  version: '1';
  global: OrbitGlobalConfig;
  nodes: Array<{
    id: string;
    type: OrbitNodeType;
    label: string;
    position: { x: number; y: number };
    config: OrbitNodeConfig;
    output_schema?: OrbitOutputSchema;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: OrbitEdgeType;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    max_iterations?: number;
  }>;
};

export type OrbitGlobalConfig = {
  llm: string;
  human_in_the_loop: boolean;
  verbose?: boolean;
  inputs?: Array<{ name: string; type?: string; description?: string }>;
};

export type OrbitRunStatus = 'idle' | 'running' | 'success' | 'error';
export type OrbitLogLine = { t: string; msg: string };

type WorkflowDefinitionLike = {
  id: string;
  name: string;
  spec?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

type WorkflowRunLike = {
  id: string;
  workflowId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_GLOBAL: OrbitGlobalConfig = {
  llm: 'gemini-3-flash-preview',
  human_in_the_loop: false,
  verbose: true,
};

const TYPE_CONFIG: Record<OrbitNodeType, OrbitNodeConfig> = {
  Navigate: { target: 'https://example.com', max_steps: null, extra_info: '', llm: null },
  Do: {
    task: 'Describe the browser action to perform.',
    max_steps: null,
    extra_info: '',
    llm: null,
  },
  Check: { condition: 'The expected result is visible.', max_steps: null, llm: null },
  Fill: { target: 'form', data: {}, llm: null },
  Read: { task: 'Extract the important facts from this page.', max_steps: null, llm: null },
  Code: { code: "print('hello from workflow')" },
  Agent: { class_name: '', task: '', prompt_template: '', max_steps: 20, llm: null },
  ForEach: { items_expr: '[]', loop_var: 'item', llm: null },
  Bootstrap: { packages: '' },
};

export const ORBIT_NODE_TYPES: OrbitNodeType[] = [
  'Navigate',
  'Do',
  'Check',
  'Fill',
  'Read',
  'Code',
  'Agent',
  'ForEach',
  'Bootstrap',
];

export const ORBIT_TEMPLATES: Array<{ name: string; desc: string; graph: OrbitGraph }> = [
  {
    name: 'Web Scrape',
    desc: 'Open a page and extract structured data.',
    graph: {
      schema: ORBIT_SPEC_SCHEMA,
      version: '1',
      global: DEFAULT_GLOBAL,
      nodes: [
        {
          id: 'n1',
          type: 'Navigate',
          label: 'Open page',
          position: { x: 120, y: 80 },
          config: { ...TYPE_CONFIG.Navigate },
        },
        {
          id: 'n2',
          type: 'Read',
          label: 'Extract data',
          position: { x: 380, y: 80 },
          config: { task: 'Extract the main heading and summary.', max_steps: null, llm: null },
          output_schema: {
            fields: [
              { name: 'heading', type: 'str' },
              { name: 'summary', type: 'str' },
            ],
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'sequential',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
        },
      ],
    },
  },
  {
    name: 'Login and Fill',
    desc: 'Navigate, fill credentials from secrets, then verify.',
    graph: {
      schema: ORBIT_SPEC_SCHEMA,
      version: '1',
      global: DEFAULT_GLOBAL,
      nodes: [
        {
          id: 'n1',
          type: 'Navigate',
          label: 'Open login page',
          position: { x: 80, y: 70 },
          config: {
            target: 'https://example.com/login',
            max_steps: null,
            extra_info: '',
            llm: null,
          },
        },
        {
          id: 'n2',
          type: 'Fill',
          label: 'Fill login form',
          position: { x: 320, y: 70 },
          config: {
            target: 'login form',
            data: { email: '{{secrets.EMAIL}}', password: '{{secrets.PASSWORD}}' },
            llm: null,
          },
        },
        {
          id: 'n3',
          type: 'Check',
          label: 'Logged in?',
          position: { x: 560, y: 70 },
          config: {
            condition: 'The user is logged in and the dashboard is visible.',
            max_steps: null,
            llm: null,
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'sequential',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
        },
        {
          id: 'e2',
          source: 'n2',
          target: 'n3',
          type: 'sequential',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
        },
      ],
    },
  },
  {
    name: 'Retry Loop',
    desc: 'Check a condition and retry an action when it fails.',
    graph: {
      schema: ORBIT_SPEC_SCHEMA,
      version: '1',
      global: DEFAULT_GLOBAL,
      nodes: [
        {
          id: 'n1',
          type: 'Navigate',
          label: 'Open page',
          position: { x: 100, y: 60 },
          config: { ...TYPE_CONFIG.Navigate },
        },
        {
          id: 'n2',
          type: 'Check',
          label: 'Succeeded?',
          position: { x: 360, y: 60 },
          config: { condition: 'The action completed successfully.', max_steps: null, llm: null },
        },
        {
          id: 'n3',
          type: 'Do',
          label: 'Try action',
          position: { x: 360, y: 220 },
          config: {
            task: 'Click the main call to action.',
            max_steps: null,
            extra_info: '',
            llm: null,
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'sequential',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
        },
        {
          id: 'e2',
          source: 'n2',
          target: 'n3',
          type: 'conditional_false',
          sourceHandle: 'false',
          targetHandle: 'handle-in',
        },
        {
          id: 'e3',
          source: 'n3',
          target: 'n2',
          type: 'loop_back',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
          max_iterations: 3,
        },
      ],
    },
  },
  {
    name: 'CSV Batch',
    desc: 'Load rows and process each item in a loop.',
    graph: {
      schema: ORBIT_SPEC_SCHEMA,
      version: '1',
      global: DEFAULT_GLOBAL,
      nodes: [
        {
          id: 'n1',
          type: 'Code',
          label: 'Load CSV',
          position: { x: 100, y: 70 },
          config: {
            code: "import csv\nwith open('/workspace/uploads/data.csv') as f:\n    rows = list(csv.DictReader(f))",
          },
        },
        {
          id: 'n2',
          type: 'ForEach',
          label: 'For each row',
          position: { x: 360, y: 70 },
          config: { items_expr: 'rows', loop_var: 'row', llm: null },
        },
        {
          id: 'n3',
          type: 'Do',
          label: 'Process row',
          position: { x: 620, y: 70 },
          config: { task: 'Process this row: {{row}}', max_steps: null, extra_info: '', llm: null },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'sequential',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
        },
        {
          id: 'e2',
          source: 'n2',
          target: 'n3',
          type: 'sequential',
          sourceHandle: 'handle-out',
          targetHandle: 'handle-in',
        },
      ],
    },
  },
];

function cloneConfig(type: OrbitNodeType): OrbitNodeConfig {
  return JSON.parse(JSON.stringify(TYPE_CONFIG[type] ?? {})) as OrbitNodeConfig;
}

function rawToFlowNode(node: OrbitGraph['nodes'][number]): OrbitFlowNode {
  return {
    id: node.id,
    type: 'orbitNode',
    position: node.position ?? { x: 0, y: 0 },
    data: {
      nodeType: node.type,
      label: node.label || node.type,
      config: node.config ?? {},
      output_schema: node.output_schema ?? null,
    },
  };
}

function rawToFlowEdge(edge: OrbitGraph['edges'][number]): OrbitFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: 'orbitEdge',
    animated: edge.type === 'loop_back',
    label:
      edge.type === 'conditional_true'
        ? 'true'
        : edge.type === 'conditional_false'
          ? 'false'
          : edge.type === 'foreach_done'
            ? 'done'
            : edge.type === 'loop_back'
              ? 'loop'
              : undefined,
    data: { orbitType: edge.type },
  };
}

function flowToRawNode(node: OrbitFlowNode): OrbitGraph['nodes'][number] {
  return {
    id: node.id,
    type: node.data.nodeType,
    label: node.data.label,
    position: node.position,
    config: node.data.config ?? {},
    output_schema: node.data.output_schema ?? null,
  };
}

function flowToRawEdge(edge: OrbitFlowEdge): OrbitGraph['edges'][number] {
  const orbitType = edge.data?.orbitType ?? 'sequential';
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: orbitType,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    ...(orbitType === 'loop_back' ? { max_iterations: 3 } : {}),
  };
}

function normalizeGraph(raw: unknown): OrbitGraph | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  const nodes = Array.isArray(s.nodes) ? s.nodes : [];
  const edges = Array.isArray(s.edges) ? s.edges : [];
  if (!nodes.length) return null;
  return {
    schema: ORBIT_SPEC_SCHEMA,
    version: '1',
    global: { ...DEFAULT_GLOBAL, ...((s.global as Partial<OrbitGlobalConfig>) ?? {}) },
    nodes: nodes
      .filter((n): n is OrbitGraph['nodes'][number] => Boolean(n && typeof n === 'object'))
      .map((n) => {
        const node = n as Record<string, unknown>;
        const nodeType = (node.type as OrbitNodeType) || 'Do';
        return {
          id: String(node.id),
          type: nodeType,
          label: String(node.label || nodeType),
          position:
            node.position && typeof node.position === 'object'
              ? (node.position as { x: number; y: number })
              : { x: 0, y: 0 },
          config: (node.config as OrbitNodeConfig) ?? {},
          output_schema: (node.output_schema as OrbitOutputSchema) ?? null,
        };
      }),
    edges: edges
      .filter((e): e is OrbitGraph['edges'][number] => Boolean(e && typeof e === 'object'))
      .map((e) => {
        const edge = e as Record<string, unknown>;
        return {
          id: String(edge.id),
          source: String(edge.source),
          target: String(edge.target),
          type: (edge.type as OrbitEdgeType) || 'sequential',
          sourceHandle: (edge.sourceHandle as string | undefined) ?? undefined,
          targetHandle: (edge.targetHandle as string | undefined) ?? undefined,
          max_iterations: typeof edge.max_iterations === 'number' ? edge.max_iterations : undefined,
        };
      }),
  };
}

function isOrbitDefinition(def: WorkflowDefinitionLike): boolean {
  const spec = def.spec;
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return false;
  const s = spec as Record<string, unknown>;
  if (s.schema === ORBIT_SPEC_SCHEMA) return true;
  return (
    Array.isArray(s.nodes) &&
    s.nodes.some((n) => {
      const typ = (n as { type?: unknown })?.type;
      return typeof typ === 'string' && ORBIT_NODE_TYPES.includes(typ as OrbitNodeType);
    })
  );
}

function edgeTypeFromConnection(conn: Connection | Edge): OrbitEdgeType {
  if (conn.sourceHandle === 'true') return 'conditional_true';
  if (conn.sourceHandle === 'false') return 'conditional_false';
  if (conn.sourceHandle === 'handle-foreach-done') return 'foreach_done';
  return 'sequential';
}

export function useOrbitAgentRunner() {
  const defaultGraph = ORBIT_TEMPLATES[0].graph;
  const [nodes, setNodes] = useState<OrbitFlowNode[]>(() => defaultGraph.nodes.map(rawToFlowNode));
  const [edges, setEdges] = useState<OrbitFlowEdge[]>(() => defaultGraph.edges.map(rawToFlowEdge));
  const [globalConfig, setGlobalConfig] = useState<OrbitGlobalConfig>(() => ({
    ...DEFAULT_GLOBAL,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Web Scrape');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState('Preview has not been generated yet.');
  const [status, setStatus] = useState('Ready');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feed, setFeed] = useState<string[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, OrbitRunStatus>>({});
  const [nodeLogs, setNodeLogs] = useState<Record<string, OrbitLogLine[]>>({});

  const { data: wfData, refetch: refetchDefinitions } = useQuery(WORKFLOW_DEFINITIONS);
  const { data: runsData, refetch: refetchRuns } = useQuery(WORKFLOW_RUNS, {
    variables: { workflowId: selectedWorkflowId },
    skip: !selectedWorkflowId,
  });
  const [createWorkflowDefinition] = useMutation(CREATE_WORKFLOW_DEFINITION);
  const [startWorkflowRun] = useMutation(START_WORKFLOW_RUN);
  const { callStreaming, abort } = useJsonRpcStream();

  const idRef = useRef(20);
  const runIdRef = useRef(0);

  const definitions = useMemo<WorkflowDefinitionLike[]>(() => {
    const defs = (wfData?.workflowDefinitions ?? []) as WorkflowDefinitionLike[];
    return defs.filter(isOrbitDefinition);
  }, [wfData?.workflowDefinitions]);

  const runs = useMemo<WorkflowRunLike[]>(
    () => (runsData?.workflowRuns ?? []) as WorkflowRunLike[],
    [runsData?.workflowRuns]
  );

  const graph = useMemo<OrbitGraph>(
    () => ({
      schema: ORBIT_SPEC_SCHEMA,
      version: '1',
      global: globalConfig,
      nodes: nodes.map(flowToRawNode),
      edges: edges.map(flowToRawEdge),
    }),
    [edges, globalConfig, nodes]
  );

  const appendFeed = useCallback((line: string) => {
    setFeed((current) => [...current.slice(-300), `[${new Date().toLocaleTimeString()}] ${line}`]);
  }, []);

  const appendNodeLog = useCallback((nodeId: string, msg: string) => {
    setNodeLogs((current) => ({
      ...current,
      [nodeId]: [...(current[nodeId] ?? []).slice(-150), { t: new Date().toISOString(), msg }],
    }));
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<OrbitFlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current) as OrbitFlowNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current) as OrbitFlowEdge[]);
  }, []);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      let orbitType = edgeTypeFromConnection(params);
      if (orbitType === 'sequential') {
        const source = nodes.find((node) => node.id === params.source);
        const target = nodes.find((node) => node.id === params.target);
        if (source && target && source.position.y > target.position.y + 60) {
          orbitType = 'loop_back';
        }
      }
      setEdges(
        (current) =>
          addEdge(
            {
              ...params,
              id: `e-${params.source}-${params.target}-${Date.now()}`,
              type: 'orbitEdge',
              animated: orbitType === 'loop_back',
              label:
                orbitType === 'conditional_true'
                  ? 'true'
                  : orbitType === 'conditional_false'
                    ? 'false'
                    : orbitType === 'foreach_done'
                      ? 'done'
                      : undefined,
              data: { orbitType },
            },
            current
          ) as OrbitFlowEdge[]
      );
    },
    [nodes]
  );

  const onEdgeDelete = useCallback((edgeId: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
  }, []);

  const addNode = useCallback((nodeType: OrbitNodeType, position: { x: number; y: number }) => {
    idRef.current += 1;
    const id = `n${idRef.current}`;
    setNodes((current) =>
      current.concat({
        id,
        type: 'orbitNode',
        position: { x: position.x - 90, y: position.y - 48 },
        data: {
          nodeType,
          label: `${nodeType} node`,
          config: cloneConfig(nodeType),
          output_schema: nodeType === 'Read' ? { fields: [] } : null,
        },
      })
    );
    setSelectedId(id);
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<OrbitNodeData>) => {
      if (!selectedId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedId ? { ...node, data: { ...node.data, ...patch } } : node
        )
      );
    },
    [selectedId]
  );

  const updateSelectedConfig = useCallback(
    (patch: OrbitNodeConfig) => {
      if (!selectedId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedId
            ? { ...node, data: { ...node.data, config: { ...node.data.config, ...patch } } }
            : node
        )
      );
    },
    [selectedId]
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId)
    );
    setSelectedId(null);
  }, [selectedId]);

  const loadGraph = useCallback((nextGraph: OrbitGraph, name?: string, id?: string | null) => {
    setGlobalConfig({ ...DEFAULT_GLOBAL, ...nextGraph.global });
    setNodes(nextGraph.nodes.map(rawToFlowNode));
    setEdges(nextGraph.edges.map(rawToFlowEdge));
    setSelectedId(null);
    if (name) setWorkflowName(name);
    setSelectedWorkflowId(id ?? null);
    setStatus('Workflow graph loaded.');
    setPreviewCode('Preview has not been generated yet.');
    setFeed([]);
    setNodeStatuses({});
    setNodeLogs({});
  }, []);

  const loadTemplate = useCallback(
    (name: string) => {
      const template = ORBIT_TEMPLATES.find((item) => item.name === name);
      if (!template) return;
      loadGraph(JSON.parse(JSON.stringify(template.graph)) as OrbitGraph, template.name, null);
    },
    [loadGraph]
  );

  const loadDefinition = useCallback(
    (id: string) => {
      const def = definitions.find((item) => String(item.id) === id);
      const normalized = normalizeGraph(def?.spec);
      if (!def || !normalized) return;
      loadGraph(normalized, def.name, String(def.id));
    },
    [definitions, loadGraph]
  );

  const newWorkflow = useCallback(() => {
    loadGraph(
      JSON.parse(JSON.stringify(ORBIT_TEMPLATES[0].graph)) as OrbitGraph,
      'Untitled Orbit workflow',
      null
    );
  }, [loadGraph]);

  const saveGraph = useCallback(async (): Promise<string | null> => {
    setStatus('Saving workflow...');
    const spec = graph;
    try {
      const result = await createWorkflowDefinition({
        variables: { name: workflowName.trim() || 'Untitled Orbit workflow', spec },
      });
      const created = result.data?.createWorkflowDefinition;
      if (created?.id) {
        const id = String(created.id);
        setSelectedWorkflowId(id);
        await refetchDefinitions();
        setStatus('Workflow saved.');
        appendFeed(`Saved workflow ${id}`);
        return id;
      }
      const message = (result as { error?: { message?: string } }).error?.message ?? 'Save failed.';
      setStatus(message);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      return null;
    }
  }, [appendFeed, createWorkflowDefinition, graph, refetchDefinitions, workflowName]);

  const generatePreview = useCallback(async () => {
    setStatus('Generating workflow.py preview...');
    let code = '';
    try {
      await callStreaming(
        'orbit.preview',
        { graph },
        {
          onDone: (result) => {
            code = typeof result.code === 'string' ? result.code : '';
          },
        }
      );
      setPreviewCode(code || 'No preview returned.');
      setStatus('Preview generated.');
      appendFeed('Generated workflow.py preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPreviewCode(message);
      setStatus(message);
    }
  }, [appendFeed, callStreaming, graph]);

  const runGraph = useCallback(async () => {
    const localRunId = ++runIdRef.current;
    setRunning(true);
    setPaused(false);
    setNodeStatuses({});
    setNodeLogs({});
    appendFeed('Run requested');
    setStatus('Starting run...');

    try {
      const workflowId = selectedWorkflowId ?? (await saveGraph());
      if (!workflowId) {
        setRunning(false);
        return;
      }
      await startWorkflowRun({ variables: { workflowId } });
      await callStreaming(
        'workflow.run',
        { workflow_id: workflowId },
        {
          onMessage: (msg) => {
            if (runIdRef.current !== localRunId) return;
            const line = String(msg.message ?? msg.type ?? JSON.stringify(msg));
            appendFeed(line);
            const nodeId = typeof msg.node_id === 'string' ? msg.node_id : undefined;
            const statusValue = typeof msg.status === 'string' ? msg.status : undefined;
            if (nodeId) {
              appendNodeLog(nodeId, line);
              if (
                statusValue === 'running' ||
                statusValue === 'success' ||
                statusValue === 'error'
              ) {
                setNodeStatuses((current) => ({ ...current, [nodeId]: statusValue }));
              }
            }
          },
          onDone: () => {
            appendFeed('Run finished');
          },
        }
      );
      await refetchRuns();
      setStatus('Run finished.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      appendFeed(`Run error: ${message}`);
    } finally {
      setRunning(false);
    }
  }, [
    appendFeed,
    appendNodeLog,
    callStreaming,
    refetchRuns,
    saveGraph,
    selectedWorkflowId,
    startWorkflowRun,
  ]);

  const requestStop = useCallback(() => {
    abort();
    runIdRef.current += 1;
    setRunning(false);
    setPaused(false);
    setStatus('Stop requested.');
    appendFeed('Stop requested');
  }, [abort, appendFeed]);

  const togglePause = useCallback(() => {
    setPaused((current) => {
      const next = !current;
      appendFeed(next ? 'User took control' : 'Handed back to agent');
      return next;
    });
  }, [appendFeed]);

  return {
    definitions,
    runs,
    nodes,
    edges,
    graph,
    globalConfig,
    setGlobalConfig,
    selectedId,
    selectedNode: nodes.find((node) => node.id === selectedId) ?? null,
    setSelectedId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgeDelete,
    addNode,
    updateSelected,
    updateSelectedConfig,
    deleteSelectedNode,
    workflowName,
    setWorkflowName,
    selectedWorkflowId,
    loadDefinition,
    loadTemplate,
    newWorkflow,
    saveGraph,
    generatePreview,
    previewCode,
    runGraph,
    requestStop,
    togglePause,
    paused,
    running,
    status,
    feed,
    nodeStatuses,
    nodeLogs,
  };
}
