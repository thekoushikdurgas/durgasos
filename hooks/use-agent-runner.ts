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
  LIST_AGENTS,
  WORKFLOW_DEFINITIONS,
} from '@/lib/graphql-modules';
import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';

export const AGENT_SPEC_SCHEMA = 'durgasos.agent.v1' as const;

export type AgentGraphNodeKind =
  | 'start'
  | 'end'
  | 'research'
  | 'seo'
  | 'summarize'
  | 'scrape'
  | 'chat'
  | 'council'
  | 'check';

export type AgentNodeConfig = {
  url?: string;
  query?: string;
  /** Extra context for chat nodes (supports `{{nodeId.summary}}`). */
  context?: string;
  maxLength?: number;
  /** For `check`: branch `true` if the last summary contains this substring (case-insensitive). Empty = always true. */
  ifContains?: string;
  useRag?: boolean;
  provider?: string;
  model?: string;
};

export type AgentNodeData = {
  kind: AgentGraphNodeKind;
  label: string;
  config: AgentNodeConfig;
};

export type AgentFlowNode = Node<AgentNodeData, 'agentNode'>;

export type NodeRunStatus = 'idle' | 'running' | 'success' | 'error';

export type AgentLogLine = { t: string; msg: string };

const defaultNodes = (): AgentFlowNode[] => [
  {
    id: 'n-start',
    type: 'agentNode',
    position: { x: 40, y: 160 },
    data: { kind: 'start', label: 'Start', config: {} },
  },
  {
    id: 'n-end',
    type: 'agentNode',
    position: { x: 560, y: 160 },
    data: { kind: 'end', label: 'End', config: {} },
  },
];

const defaultEdges: Edge[] = [];

let nid = 0;

function interpolate(template: string, outputs: Record<string, Record<string, unknown>>): string {
  if (!template) return '';
  return template.replace(/\{\{([\w-]+)\.(\w+)\}\}/g, (_, nodeId: string, key: string) => {
    const bucket = outputs[nodeId];
    if (!bucket) return '';
    const v = bucket[key];
    if (v == null) return '';
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

function buildPageData(
  rawUrl: string,
  outputs: Record<string, Record<string, unknown>>
): { url: string; title?: string } {
  const url = interpolate(rawUrl, outputs).trim() || 'https://example.com';
  return { url, title: undefined };
}

function pickCheckBranch(node: AgentFlowNode, lastSummary: string): 'true' | 'false' {
  const needle = (node.data.config.ifContains ?? '').trim();
  if (!needle) return 'true';
  return lastSummary.toLowerCase().includes(needle.toLowerCase()) ? 'true' : 'false';
}

function followersOf(sourceId: string, edges: Edge[], branch: 'true' | 'false' | null): string[] {
  return edges
    .filter((e) => {
      if (e.source !== sourceId) return false;
      const sh = e.sourceHandle;
      if (branch) return sh === branch;
      if (sh === 'true' || sh === 'false') return false;
      return true;
    })
    .map((e) => e.target);
}

function summarizeRpcResult(result: Record<string, unknown>): string {
  if (typeof result.summary === 'string' && result.summary) return result.summary;
  if (typeof result.message === 'string' && result.message) return result.message;
  if (typeof result.full_response === 'string' && result.full_response) return result.full_response;
  try {
    return JSON.stringify(result).slice(0, 2000);
  } catch {
    return '';
  }
}

export function useAgentRunner() {
  const { data: agentsData } = useQuery(LIST_AGENTS);
  const { data: wfData, refetch: refetchWf } = useQuery(WORKFLOW_DEFINITIONS);
  const [createWf] = useMutation(CREATE_WORKFLOW_DEFINITION);
  const { callStreaming, abort: abortWs } = useJsonRpcStream();

  const [nodes, setNodes] = useState<AgentFlowNode[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [workflowName, setWorkflowName] = useState(
    () => `Agent flow ${new Date().toISOString().slice(0, 16)}`
  );
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  const [feed, setFeed] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeRunStatus>>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, Record<string, unknown>>>({});
  const [nodeLogs, setNodeLogs] = useState<Record<string, AgentLogLine[]>>({});

  const pauseRef = useRef(false);
  const runIdRef = useRef(0);
  const stopRef = useRef(false);

  const definitions = useMemo(
    () => wfData?.workflowDefinitions ?? [],
    [wfData?.workflowDefinitions]
  );

  const appendFeed = useCallback((line: string) => {
    setFeed((f) => [...f.slice(-400), `[${new Date().toLocaleTimeString()}] ${line}`]);
  }, []);

  const appendNodeLog = useCallback((nodeId: string, msg: string) => {
    const line = { t: new Date().toISOString(), msg };
    setNodeLogs((m) => ({
      ...m,
      [nodeId]: [...(m[nodeId] ?? []).slice(-200), line],
    }));
  }, []);

  const waitWhilePaused = useCallback(async () => {
    while (pauseRef.current && !stopRef.current) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<AgentFlowNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as AgentFlowNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, []);

  const onEdgeDelete = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, []);

  const addNode = useCallback((kind: AgentGraphNodeKind, position: { x: number; y: number }) => {
    nid += 1;
    const id = `n-${kind}-${nid}`;
    const label =
      kind === 'start'
        ? 'Start'
        : kind === 'end'
          ? 'End'
          : kind === 'research'
            ? 'Research'
            : kind === 'seo'
              ? 'SEO'
              : kind === 'summarize'
                ? 'Summarize'
                : kind === 'scrape'
                  ? 'Scrape'
                  : kind === 'chat'
                    ? 'Chat'
                    : kind === 'council'
                      ? 'Council'
                      : 'Check';
    setNodes((nds) =>
      nds.concat({
        id,
        type: 'agentNode',
        position: { x: position.x - 90, y: position.y - 50 },
        data: {
          kind,
          label,
          config:
            kind === 'check'
              ? { ifContains: '' }
              : kind === 'summarize'
                ? { maxLength: 500, url: 'https://example.com' }
                : { url: 'https://example.com', query: '' },
        },
      } as AgentFlowNode)
    );
  }, []);

  const updateSelectedConfig = useCallback(
    (patch: Partial<AgentNodeConfig>) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedId
            ? {
                ...n,
                data: {
                  ...n.data,
                  config: { ...n.data.config, ...patch },
                },
              }
            : n
        )
      );
    },
    [selectedId]
  );

  const updateSelectedLabel = useCallback(
    (label: string) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, label } } : n))
      );
    },
    [selectedId]
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
      const rawNodes = s.nodes;
      const rawEdges = s.edges;
      if (Array.isArray(rawNodes) && rawNodes.length > 0) {
        const normalized = (rawNodes as Node[]).map((n) => {
          const d = (n.data ?? {}) as Partial<AgentNodeData>;
          const kind = (d.kind as AgentGraphNodeKind) ?? 'research';
          return {
            ...n,
            type: 'agentNode',
            position: n.position ?? { x: 0, y: 0 },
            data: {
              kind,
              label: d.label ?? String(n.id),
              config: (d.config as AgentNodeConfig) ?? {},
            },
          } as AgentFlowNode;
        });
        setNodes(normalized);
        setEdges(Array.isArray(rawEdges) ? (rawEdges as Edge[]) : []);
      }
    },
    [definitions]
  );

  const newCanvas = useCallback(() => {
    setSelectedWorkflowId(null);
    setWorkflowName(`Agent flow ${new Date().toISOString().slice(0, 16)}`);
    setNodes(defaultNodes());
    setEdges(defaultEdges);
    setSelectedId(null);
    setNodeStatuses({});
    setNodeOutputs({});
    setNodeLogs({});
    setFeed([]);
  }, []);

  const saveGraph = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const spec = {
        schema: AGENT_SPEC_SCHEMA,
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
      if (created?.id) setSelectedWorkflowId(String(created.id));
      await refetchWf();
      appendFeed(`Saved workflow definition: ${created?.id ?? '?'}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [appendFeed, createWf, edges, nodes, refetchWf, workflowName]);

  const executeOneNode = useCallback(
    async (
      node: AgentFlowNode,
      outputs: Record<string, Record<string, unknown>>,
      convId: string
    ): Promise<void> => {
      const { kind, config } = node.data;
      const page = buildPageData(config.url ?? '', outputs);
      const pageData = {
        url: page.url,
        title: page.title,
      };

      setNodeStatuses((s) => ({ ...s, [node.id]: 'running' }));
      appendNodeLog(node.id, `Run ${kind}`);

      const pushRpc = (msg: Record<string, unknown>) => {
        appendNodeLog(node.id, JSON.stringify(msg).slice(0, 500));
      };

      try {
        if (kind === 'check') {
          const last = String(outputs._ctx?.lastSummary ?? '');
          const branch = pickCheckBranch(node, last);
          outputs[node.id] = { summary: branch, branch };
          appendNodeLog(node.id, `branch=${branch}`);
          setNodeOutputs((o) => ({ ...o, [node.id]: { ...outputs[node.id] } }));
          setNodeStatuses((s) => ({ ...s, [node.id]: 'success' }));
          return;
        }

        if (kind === 'research') {
          await callStreaming(
            'agents.analyze',
            {
              agent_type: 'research',
              page_data: pageData,
              query: interpolate(config.query ?? 'Give concise research insights.', outputs),
            },
            {
              onMessage: pushRpc,
              onDone: (res) => {
                const summary = summarizeRpcResult(res);
                outputs[node.id] = { ...res, summary };
                outputs._ctx = { ...(outputs._ctx ?? {}), lastSummary: summary };
              },
            }
          );
        } else if (kind === 'scrape') {
          await callStreaming(
            'agents.analyze',
            {
              agent_type: 'website_scraper',
              page_data: pageData,
              query: interpolate(config.query ?? 'Scrape and analyze this site.', outputs),
            },
            {
              onMessage: pushRpc,
              onDone: (res) => {
                const summary = summarizeRpcResult(res);
                outputs[node.id] = { ...res, summary };
                outputs._ctx = { ...(outputs._ctx ?? {}), lastSummary: summary };
              },
            }
          );
        } else if (kind === 'seo') {
          await callStreaming(
            'agents.quick_seo',
            { page_data: pageData },
            {
              onMessage: pushRpc,
              onDone: (res) => {
                const summary = summarizeRpcResult(res);
                outputs[node.id] = { ...res, summary };
                outputs._ctx = { ...(outputs._ctx ?? {}), lastSummary: summary };
              },
            }
          );
        } else if (kind === 'summarize') {
          await callStreaming(
            'agents.summarize',
            {
              page_data: pageData,
              max_length: config.maxLength ?? 500,
            },
            {
              onMessage: pushRpc,
              onDone: (res) => {
                const summary = summarizeRpcResult(res);
                outputs[node.id] = { ...res, summary };
                outputs._ctx = { ...(outputs._ctx ?? {}), lastSummary: summary };
              },
            }
          );
        } else if (kind === 'council') {
          await callStreaming(
            'council.run',
            {
              query: interpolate(config.query ?? 'Council review of the page.', outputs),
              page_data: pageData,
            },
            {
              onMessage: pushRpc,
              onDone: (res) => {
                const summary = summarizeRpcResult(res);
                outputs[node.id] = { ...res, summary };
                outputs._ctx = { ...(outputs._ctx ?? {}), lastSummary: summary };
              },
            }
          );
        } else if (kind === 'chat') {
          let acc = '';
          await callStreaming(
            'chat.completions',
            {
              message: interpolate(config.query ?? 'Hello', outputs),
              stream: true,
              conversation_id: convId,
              use_rag: config.useRag ?? false,
              context: interpolate(config.context ?? '', outputs) || undefined,
              ...(config.provider ? { provider: config.provider } : {}),
              ...(config.model ? { model: config.model } : {}),
            },
            {
              onMessage: (msg) => {
                pushRpc(msg);
                if (msg.type === 'chunk' && typeof msg.content === 'string') acc += msg.content;
              },
              onDone: (res) => {
                const summary =
                  (typeof res.full_response === 'string' && res.full_response) ||
                  (typeof res.message === 'string' && res.message) ||
                  acc;
                outputs[node.id] = { ...res, summary };
                outputs._ctx = { ...(outputs._ctx ?? {}), lastSummary: String(summary) };
              },
            }
          );
        } else {
          appendNodeLog(node.id, `skip kind=${kind}`);
        }

        setNodeOutputs((o) => ({ ...o, [node.id]: { ...(outputs[node.id] ?? {}) } }));
        setNodeStatuses((s) => ({ ...s, [node.id]: 'success' }));
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        appendNodeLog(node.id, `error: ${err}`);
        setNodeStatuses((s) => ({ ...s, [node.id]: 'error' }));
        throw e;
      }
    },
    [appendNodeLog, callStreaming]
  );

  const runGraph = useCallback(async () => {
    const myRun = ++runIdRef.current;
    stopRef.current = false;
    setRunning(true);
    pauseRef.current = false;
    setPaused(false);
    setFeed([]);
    setNodeStatuses({});
    setNodeOutputs({});
    setNodeLogs({});

    const start = nodes.find((n) => n.data.kind === 'start');
    if (!start) {
      appendFeed('No Start node on canvas.');
      setRunning(false);
      return;
    }

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<string, AgentFlowNode>;
    const outputs: Record<string, Record<string, unknown>> = {};
    const convId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `agent-flow-${crypto.randomUUID()}`
        : `agent-flow-${Date.now()}`;

    appendFeed('Run started');

    try {
      let frontier: string[] = [start.id];
      const executed = new Set<string>();

      while (frontier.length) {
        if (runIdRef.current !== myRun) break;
        if (stopRef.current) {
          appendFeed('Stopped by user.');
          break;
        }
        await waitWhilePaused();

        const id = frontier.shift()!;
        if (executed.has(id)) continue;
        executed.add(id);
        const node = byId[id];
        if (!node) continue;

        if (node.data.kind === 'end') {
          appendFeed('Reached End.');
          break;
        }
        if (node.data.kind === 'start') {
          frontier.push(...followersOf(id, edges, null));
          continue;
        }

        try {
          await executeOneNode(node, outputs, convId);
        } catch {
          appendFeed(`Node failed: ${node.id}`);
          break;
        }

        if (stopRef.current) {
          appendFeed('Stopped by user.');
          break;
        }

        const branchPick =
          node.data.kind === 'check'
            ? pickCheckBranch(node, String(outputs._ctx?.lastSummary ?? ''))
            : null;
        frontier.push(...followersOf(id, edges, branchPick));
      }

      appendFeed('Run finished');
    } catch (e) {
      appendFeed(`Run error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }, [appendFeed, edges, executeOneNode, nodes, waitWhilePaused]);

  const requestStop = useCallback(() => {
    stopRef.current = true;
    pauseRef.current = false;
    setPaused(false);
    abortWs();
    appendFeed('Stop requested…');
  }, [abortWs, appendFeed]);

  const togglePause = useCallback(() => {
    pauseRef.current = !pauseRef.current;
    setPaused(pauseRef.current);
    appendFeed(pauseRef.current ? 'Paused between steps' : 'Resumed');
  }, [appendFeed]);

  return {
    agentsList: agentsData?.listAgents,
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
    setSelectedWorkflowId,
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
    appendFeed,
  };
}
