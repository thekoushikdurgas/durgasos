'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';

import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';
import { getDesktopAiConversationId } from '@/lib/desktop-ai-conversation';

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

type Pending = {
  handlers: AiStreamHandlers;
  aborted: boolean;
  acc: string;
};

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
      result?: RpcResult;
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
      pending.handlers.onError(msg.error.message ?? 'Request failed');
      pendingRef.current.delete(idKey);
      return;
    }

    const result = msg.result;
    if (!result || typeof result !== 'object') return;

    const typ = result.type;

    if (typ === 'chunk' && typeof result.content === 'string') {
      pending.acc += result.content;
      pending.handlers.onChunk?.(result.content, pending.acc);
      return;
    }

    if (typ === 'start') {
      return;
    }

    if (typ === 'done') {
      const full =
        typeof result.full_response === 'string' && result.full_response.length > 0
          ? result.full_response
          : pending.acc;
      pending.handlers.onDone(full);
      pendingRef.current.delete(idKey);
      return;
    }

    if (typ === 'error') {
      const err = typeof result.error === 'string' ? result.error : 'Stream error';
      pending.handlers.onError(err);
      pendingRef.current.delete(idKey);
      return;
    }

    if (typeof result.message === 'string' && typ === undefined) {
      pending.handlers.onDone(result.message);
      pendingRef.current.delete(idKey);
    }
  };

  ws.onerror = () => {
    for (const [, p] of pendingRef.current) {
      if (!p.aborted) p.handlers.onError('WebSocket error');
    }
    pendingRef.current.clear();
  };

  ws.onclose = () => {
    if (wsRef.current === ws) wsRef.current = null;
    for (const [, p] of pendingRef.current) {
      if (!p.aborted) p.handlers.onError('Connection closed');
    }
    pendingRef.current.clear();
    if (!unmountedRef.current) {
      scheduleReconnectRef.current();
    }
  };
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
      if (!p.aborted) {
        p.aborted = true;
        p.handlers.onAborted?.();
        pendingRef.current.delete(id);
      }
    }
  }, []);

  const sendCompletion = useCallback(
    (
      opts: {
        message: string;
        think: boolean;
        deepSearch: boolean;
        provider?: string;
        model?: string | null;
      },
      handlers: AiStreamHandlers
    ): (() => void) => {
      const rid = crypto.randomUUID();
      const pending: Pending = { handlers, aborted: false, acc: '' };
      pendingRef.current.set(rid, pending);

      const provider = opts.provider?.trim() || defaultProvider();
      const model = (opts.model?.trim() || defaultModel()) ?? undefined;

      const context = opts.think ? THINK_INSTRUCTION : undefined;

      const params: Record<string, unknown> = {
        message: opts.message,
        stream: true,
        conversation_id: getDesktopAiConversationId(),
        use_rag: opts.deepSearch,
      };
      if (provider) params.provider = provider;
      if (model) params.model = model;
      if (context) params.context = context;

      const payload = {
        jsonrpc: '2.0' as const,
        id: rid,
        method: 'chat.completions',
        params,
      };

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
            p.handlers.onError('Connection timeout');
            pendingRef.current.delete(rid);
            return;
          }
          setTimeout(poll, 80);
        };
        setTimeout(poll, 50);
      }

      return () => {
        const p = pendingRef.current.get(rid);
        if (p) p.aborted = true;
        pendingRef.current.delete(rid);
      };
    },
    [connect]
  );

  return { sendCompletion, abortActiveRequests };
}
