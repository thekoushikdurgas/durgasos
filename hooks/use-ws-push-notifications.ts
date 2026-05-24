'use client';

import { useCallback, useEffect, useRef } from 'react';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';
import {
  dispatchOsNotification,
  dispatchOsLog,
  type OsNotificationInput,
} from '@/lib/notifications';

type PushNotifPayload = {
  id: string;
  title: string;
  body?: string | null;
  level: 'info' | 'success' | 'warning' | 'error';
  source?: string;
  timestamp?: number;
};

type WsFrame = {
  type: 'notification' | 'heartbeat' | 'done' | string;
  notification?: PushNotifPayload;
  reason?: string;
  ts?: number;
};

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

/** Keeps a persistent WebSocket open to `system.notifications`.
 *  On each "notification" frame it calls dispatchOsNotification,
 *  which the NotificationsProvider picks up via CustomEvent. */
export function useWsPushNotifications(enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const deadRef = useRef(false);
  const delayRef = useRef(RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    if (deadRef.current) return;
    if (reconnectTimerRef.current) return;
    const delay = delayRef.current;
    delayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (deadRef.current) return;

    let token: string | null = null;
    try {
      token = readStoredAuthTokens()?.access ?? null;
    } catch {
      /* no tokens stored */
    }

    let url: string;
    try {
      url = getAiWebSocketGatewayUrl({ accessToken: token });
    } catch {
      return; // backend URL not configured — skip silently
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    const rid = crypto.randomUUID();

    ws.onopen = () => {
      delayRef.current = RECONNECT_DELAY_MS; // reset backoff on successful open
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: rid,
          method: 'system.notifications',
          params: {},
        })
      );
    };

    ws.onmessage = (ev) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (!raw || typeof raw !== 'object') return;

      const msg = raw as {
        jsonrpc?: string;
        result?: WsFrame;
        error?: { message?: string };
      };
      if (msg.jsonrpc !== '2.0') return;

      // Handle error frame
      if (msg.error) {
        dispatchOsLog({
          category: 'network',
          level: 'warn',
          message: `system.notifications error: ${msg.error.message ?? 'unknown'}`,
        });
        return;
      }

      const frame = msg.result;
      if (!frame) return;

      if (frame.type === 'notification' && frame.notification) {
        const n = frame.notification;
        const level = (['info', 'success', 'warning', 'error'] as const).includes(n.level as 'info')
          ? n.level
          : ('info' as const);

        const input: OsNotificationInput = {
          title: n.title,
          body: n.body ?? undefined,
          level,
        };
        dispatchOsNotification(input);

        // Also log to OS log stream
        dispatchOsLog({
          category: 'network',
          level: level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info',
          message: `[push] ${n.title}${n.body ? ` — ${n.body}` : ''}`,
          meta: { source: n.source },
        });
        return;
      }

      if (frame.type === 'done') {
        // Server ended the stream — reconnect
        scheduleReconnect();
        return;
      }

      // heartbeat: ignore (just keeps connection alive)
    };

    ws.onerror = () => {
      scheduleReconnect();
    };

    ws.onclose = () => {
      if (!deadRef.current) {
        scheduleReconnect();
      }
    };
  }, [scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    deadRef.current = false;
    connect();

    return () => {
      deadRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [enabled, connect]);
}
