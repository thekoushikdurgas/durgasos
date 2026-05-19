'use client';

import { useCallback } from 'react';

import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';

export type WorkflowStreamHandlers = {
  onMessage?: (msg: Record<string, unknown>) => void;
  onDone?: (summary: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

/**
 * Runs `workflow.run` over a dedicated WebSocket JSON-RPC connection.
 */
export function useWorkflowRunner() {
  const { callStreaming, abort } = useJsonRpcStream();

  const runWorkflow = useCallback(
    async (workflowId: string, handlers: WorkflowStreamHandlers = {}): Promise<void> => {
      await callStreaming('workflow.run', { workflow_id: workflowId }, handlers);
    },
    [callStreaming]
  );

  return { runWorkflow, abort };
}
