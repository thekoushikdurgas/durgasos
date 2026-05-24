'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';

import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';
import { getDesktopAiConversationId } from '@/lib/desktop-ai-conversation';
import { GatewayCancelledError } from '@/lib/gateway-errors';

const THINK_INSTRUCTION =
  'Think step by step briefly, then give a clear, direct final answer for the user.';

type RpcResult = {
  type?: string;
  content?: string;
  full_response?: string;
  error?: string;
  message?: string;
};

export type AiStreamHandlers = {
  onChunk?: (delta: string, fullSoFar: string) => void;
  onDone: (full: string) => void;
  onError: (message: string) => void;
  /** User stopped generation; server may still send chunks (ignored). */
  onAborted?: () => void;
};

type StreamPending = {
  kind: 'stream';
  handlers: AiStreamHandlers;
  aborted: boolean;
  acc: string;
};

type RpcPending = {
  kind: 'rpc';
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  aborted: boolean;
};

type Pending = StreamPending | RpcPending;

function defaultProvider(): string | undefined {
  const p = process.env.NEXT_PUBLIC_CHAT_PROVIDER?.trim();
  return p || undefined;
}

function defaultModel(): string | undefined {
  const m = process.env.NEXT_PUBLIC_CHAT_MODEL?.trim();
  return m || undefined;
}

function openWebSocket(
  wsRef: MutableRefObject<WebSocket | null>,
  pendingRef: MutableRefObject<Map<string, Pending>>,
  reconnectRef: MutableRefObject<number | null>,
  scheduleReconnectRef: MutableRefObject<() => void>,
  unmountedRef: MutableRefObject<boolean>
) {
  if (typeof window === 'undefined') return;
  const cur = wsRef.current;
  if (cur?.readyState === WebSocket.OPEN || cur?.readyState === WebSocket.CONNECTING) {
    return;
  }
  if (cur) {
    try {
      cur.close();
    } catch {
      /* ignore */
    }
    wsRef.current = null;
  }

  const token = readStoredAuthTokens()?.access ?? null;
  const url = getAiWebSocketGatewayUrl({ accessToken: token });
  const ws = new WebSocket(url);
  wsRef.current = ws;

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
      result?: RpcResult | unknown;
      error?: { message?: string; code?: number };
    };
    if (msg.jsonrpc !== '2.0') return;

    if (msg.id === undefined || msg.id === null) {
      return;
    }

    const idKey = String(msg.id);
    const pending = pendingRef.current.get(idKey);
    if (!pending) return;
    if (pending.aborted) {
      pendingRef.current.delete(idKey);
      return;
    }

    if (msg.error) {
      const errText = msg.error.message ?? 'Request failed';
      const code = msg.error.code;

      if (code === -32001) {
        import('@/lib/restore-auth-session').then(({ silentRefreshAuthSession }) => {
          void silentRefreshAuthSession().then((ok) => {
            if (ok && wsRef.current === ws) {
              try {
                ws.close();
              } catch {
                /* ignore */
              }
            }
          });
        });
      }

      if (pending.kind === 'rpc') {
        pending.reject(new Error(errText));
      } else {
        pending.handlers.onError(errText);
      }
      pendingRef.current.delete(idKey);
      return;
    }

    if (pending.kind === 'rpc') {
      pending.resolve(msg.result);
      pendingRef.current.delete(idKey);
      return;
    }

    const result = msg.result;
    if (!result || typeof result !== 'object') return;
    const streamResult = result as RpcResult;
    const typ = streamResult.type;

    if (typ === 'chunk' && typeof streamResult.content === 'string') {
      pending.acc += streamResult.content;
      pending.handlers.onChunk?.(streamResult.content, pending.acc);
      return;
    }

    if (typ === 'start') {
      return;
    }

    if (typ === 'done') {
      const full =
        typeof streamResult.full_response === 'string' && streamResult.full_response.length > 0
          ? streamResult.full_response
          : pending.acc;
      pending.handlers.onDone(full);
      pendingRef.current.delete(idKey);
      return;
    }

    if (typ === 'error') {
      const err = typeof streamResult.error === 'string' ? streamResult.error : 'Stream error';
      pending.handlers.onError(err);
      pendingRef.current.delete(idKey);
      return;
    }

    if (typeof streamResult.message === 'string' && typ === undefined) {
      pending.handlers.onDone(streamResult.message);
      pendingRef.current.delete(idKey);
    }
  };

  ws.onerror = () => {
    if (unmountedRef.current) return;
    for (const [, p] of pendingRef.current) {
      if (p.aborted) continue;
      if (p.kind === 'rpc') {
        p.reject(new Error('WebSocket error'));
      } else {
        p.handlers.onError('WebSocket error');
      }
    }
    pendingRef.current.clear();
  };

  ws.onclose = () => {
    if (wsRef.current === ws) wsRef.current = null;
    if (unmountedRef.current) {
      pendingRef.current.clear();
      return;
    }
    for (const [, p] of pendingRef.current) {
      if (p.aborted) continue;
      if (p.kind === 'rpc') {
        p.reject(new Error('Connection closed'));
      } else {
        p.handlers.onError('Connection closed');
      }
    }
    pendingRef.current.clear();
    scheduleReconnectRef.current();
  };
}

function scheduleOrSend(
  wsRef: MutableRefObject<WebSocket | null>,
  pendingRef: MutableRefObject<Map<string, Pending>>,
  connect: () => void,
  rid: string,
  payload: { jsonrpc: '2.0'; id: string; method: string; params: Record<string, unknown> }
) {
  const trySend = () => {
    const ws = wsRef.current;
    const p = pendingRef.current.get(rid);
    if (!p || p.aborted) {
      pendingRef.current.delete(rid);
      return;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  if (wsRef.current?.readyState === WebSocket.OPEN) {
    trySend();
  } else {
    connect();
    const deadline = Date.now() + 15_000;
    const poll = () => {
      const p = pendingRef.current.get(rid);
      if (!p || p.aborted) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        trySend();
        return;
      }
      if (Date.now() > deadline) {
        if (p.kind === 'rpc') {
          p.reject(new Error('Connection timeout'));
        } else {
          p.handlers.onError('Connection timeout');
        }
        pendingRef.current.delete(rid);
        return;
      }
      setTimeout(poll, 80);
    };
    setTimeout(poll, 50);
  }
}

export function useAiChatGateway() {
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, Pending>>(new Map());
  const reconnectRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);
  const scheduleReconnectRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    if (typeof window === 'undefined' || unmountedRef.current) return;
    if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
    reconnectRef.current = window.setTimeout(() => {
      reconnectRef.current = null;
      openWebSocket(wsRef, pendingRef, reconnectRef, scheduleReconnectRef, unmountedRef);
    }, 600);
  }, []);

  useLayoutEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  const connect = useCallback(() => {
    openWebSocket(wsRef, pendingRef, reconnectRef, scheduleReconnectRef, unmountedRef);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    const pendingMap = pendingRef.current;
    return () => {
      unmountedRef.current = true;
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      const w = wsRef.current;
      wsRef.current = null;
      for (const [, p] of pendingMap) {
        if (!p.aborted && p.kind === 'rpc') {
          p.reject(new GatewayCancelledError('Unmounted'));
        }
      }
      pendingMap.clear();
      try {
        w?.close();
      } catch {
        /* ignore */
      }
    };
  }, [connect]);

  const abortActiveRequests = useCallback(() => {
    for (const [id, p] of [...pendingRef.current.entries()]) {
      if (p.aborted) continue;
      p.aborted = true;
      if (p.kind === 'rpc') {
        p.reject(new GatewayCancelledError('Aborted'));
      } else {
        p.handlers.onAborted?.();
      }
      pendingRef.current.delete(id);
    }
  }, []);

  const callRpc = useCallback(
    (method: string, params: Record<string, unknown>): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const rid = crypto.randomUUID();
        pendingRef.current.set(rid, {
          kind: 'rpc',
          aborted: false,
          resolve,
          reject,
        });
        const payload = {
          jsonrpc: '2.0' as const,
          id: rid,
          method,
          params,
        };
        scheduleOrSend(wsRef, pendingRef, connect, rid, payload);
      });
    },
    [connect]
  );

  const sendStreamingMethod = useCallback(
    (method: string, params: Record<string, unknown>, handlers: AiStreamHandlers): (() => void) => {
      const rid = crypto.randomUUID();
      const pending: StreamPending = { kind: 'stream', handlers, aborted: false, acc: '' };
      pendingRef.current.set(rid, pending);
      const payload = {
        jsonrpc: '2.0' as const,
        id: rid,
        method,
        params,
      };
      scheduleOrSend(wsRef, pendingRef, connect, rid, payload);
      return () => {
        const p = pendingRef.current.get(rid);
        if (p) p.aborted = true;
        pendingRef.current.delete(rid);
      };
    },
    [connect]
  );

  const sendCompletion = useCallback(
    (
      opts: {
        message: string;
        think: boolean;
        deepSearch: boolean;
        useRag?: boolean;
        context?: string | null;
        provider?: string;
        model?: string | null;
        conversationId?: string | null;
      },
      handlers: AiStreamHandlers
    ): (() => void) => {
      const provider = opts.provider?.trim() || defaultProvider();
      const model = (opts.model?.trim() || defaultModel()) ?? undefined;

      const thinkPart = opts.think ? THINK_INSTRUCTION : '';
      const userCtx = typeof opts.context === 'string' ? opts.context.trim() : '';
      const contextMerged = [thinkPart, userCtx].filter(Boolean).join('\n\n') || undefined;

      const convId =
        typeof opts.conversationId === 'string' && opts.conversationId.trim().length > 0
          ? opts.conversationId.trim()
          : getDesktopAiConversationId();

      const useRag = opts.useRag ?? opts.deepSearch;

      const params: Record<string, unknown> = {
        message: opts.message,
        stream: true,
        conversation_id: convId,
        use_rag: useRag,
      };
      if (provider) params.provider = provider;
      if (model) params.model = model;
      if (contextMerged) params.context = contextMerged;

      return sendStreamingMethod('chat.completions', params, handlers);
    },
    [sendStreamingMethod]
  );

  return { sendCompletion, sendStreamingMethod, callRpc, abortActiveRequests };
}
