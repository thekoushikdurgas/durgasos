'use client';

import { useCallback, useRef } from 'react';

import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';

export type WorkflowStreamHandlers = {
  onMessage?: (msg: Record<string, unknown>) => void;
  onDone?: (summary: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

/**
 * Runs `workflow.run` over a dedicated WebSocket JSON-RPC connection.
 */
export function useWorkflowRunner() {
  const abortRef = useRef(false);

  const runWorkflow = useCallback(
    async (
      workflowId: string,
      handlers: WorkflowStreamHandlers = {}
    ): Promise<void> => {
      abortRef.current = false;
      const token = readStoredAuthTokens()?.access ?? null;
      const url = getAiWebSocketGatewayUrl({ accessToken: token });

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(url);
        const rid = crypto.randomUUID();

        const cleanup = () => {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        };

        ws.onopen = () => {
          if (abortRef.current) {
            cleanup();
            resolve();
            return;
          }
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: rid,
              method: 'workflow.run',
              params: { workflow_id: workflowId },
            })
          );
        };

        ws.onmessage = (ev) => {
          let data: unknown;
          try {
            data = JSON.parse(String(ev.data));
          } catch {
            return;
          }
          if (!data || typeof data !== 'object') return;
          const msg = data as {
            jsonrpc?: string;
            id?: string | number | null;
            result?: Record<string, unknown>;
            error?: { message?: string };
          };
          if (msg.jsonrpc !== '2.0') return;
          if (msg.id !== undefined && msg.id !== null && String(msg.id) !== rid) return;

          if (msg.error) {
            handlers.onError?.(msg.error.message ?? 'workflow.run failed');
            cleanup();
            reject(new Error(msg.error.message ?? 'workflow.run failed'));
            return;
          }
          const result = msg.result;
          if (result && typeof result === 'object') {
            handlers.onMessage?.(result);
            const typ = result.type as string | undefined;
            if (typ === 'done' || typ === 'error') {
              if (typ === 'error') {
                const err = String(result.error ?? 'Workflow error');
                handlers.onError?.(err);
                cleanup();
                reject(new Error(err));
                return;
              }
              handlers.onDone?.(result);
              cleanup();
              resolve();
            }
          }
        };

        ws.onerror = () => {
          handlers.onError?.('WebSocket error');
          cleanup();
          reject(new Error('WebSocket error'));
        };

        ws.onclose = () => {
          /* if not resolved, treat as abrupt end */
        };
      });
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { runWorkflow, abort };
}
