'use client';

import { useCallback, useRef } from 'react';

import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';
import { swallowClientError } from '@/lib/safe-client-storage';

export type JsonRpcStreamHandlers = {
  onMessage?: (msg: Record<string, unknown>) => void;
  onDone?: (summary: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

/**
 * Opens one WebSocket JSON-RPC request and forwards streaming `result` payloads
 * until `type` is `done` or `error` (same contract as `workflow.run` / `system.feed`).
 */
export function useJsonRpcStream() {
  const abortRef = useRef(false);

  const callStreaming = useCallback(
    async (
      method: string,
      params: Record<string, unknown>,
      handlers: JsonRpcStreamHandlers = {}
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
          } catch (err) {
            swallowClientError('json-rpc-ws.close', err);
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
              method,
              params,
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
            error?: { message?: string; code?: number };
          };
          if (msg.jsonrpc !== '2.0') return;
          if (msg.id !== undefined && msg.id !== null && String(msg.id) !== rid) return;

          if (msg.error) {
            const isAuthErr = msg.error.code === -32001;
            if (isAuthErr) {
              import('@/lib/restore-auth-session').then(({ silentRefreshAuthSession }) => {
                void silentRefreshAuthSession().then(() => {});
              });
            }
            handlers.onError?.(msg.error.message ?? `${method} failed`);
            cleanup();
            reject(new Error(msg.error.message ?? `${method} failed`));
            return;
          }
          const result = msg.result;
          if (result && typeof result === 'object') {
            handlers.onMessage?.(result);
            const typ = result.type as string | undefined;
            if (typ === 'done' || typ === 'error') {
              if (typ === 'error') {
                const err = String(result.error ?? 'RPC error');
                handlers.onError?.(err);
                cleanup();
                reject(new Error(err));
                return;
              }
              handlers.onDone?.(result);
              cleanup();
              resolve();
              return;
            }
            // Streaming chunks (e.g. chat.completions, workflow.run)
            if (typ === 'chunk' || typ === 'start') {
              return;
            }
            // Single JSON-RPC result (e.g. agents.*, council.run) — no `type` field
            if (typ === undefined) {
              handlers.onDone?.(result);
              cleanup();
              resolve();
              return;
            }
            // Unknown streaming step (e.g. progress) — wait for terminal frame
            return;
          }
        };

        ws.onerror = () => {
          handlers.onError?.('WebSocket error');
          cleanup();
          reject(new Error('WebSocket error'));
        };

        ws.onclose = () => {
          /* abrupt end: leave promise pending unless already settled */
        };
      });
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { callStreaming, abort };
}
