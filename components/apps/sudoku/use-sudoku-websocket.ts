'use client';

import { useCallback, useEffect, useRef } from 'react';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getAiWebSocketGatewayUrl } from '@/lib/backend-url';

export function useSudokuWebSocket(
  onRoomUpdate: (room: any) => void,
  onConnectedChange: (connected: boolean) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const wsAuthenticatedRef = useRef(false);
  const onRoomUpdateRef = useRef(onRoomUpdate);
  const onConnectedChangeRef = useRef(onConnectedChange);

  useEffect(() => {
    onRoomUpdateRef.current = onRoomUpdate;
    onConnectedChangeRef.current = onConnectedChange;
  });

  const connectWebSocket = useCallback(() => {
    try {
      const token = readStoredAuthTokens()?.access ?? null;
      const url = getAiWebSocketGatewayUrl({ accessToken: token });
      const ws = new WebSocket(url);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'auth-conn',
            method: 'auth.connect',
            params: { token },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          // Check for auth.connect response
          if (data.id === 'auth-conn' && data.result?.status === 'authenticated') {
            wsAuthenticatedRef.current = true;
            onConnectedChangeRef.current(true);
          }

          // Check for push notifications (e.g. sudoku.room.update)
          if (data.result) {
            const result = data.result as { type?: string; room?: any };
            if (result.type === 'connected') {
              wsAuthenticatedRef.current = true;
              onConnectedChangeRef.current(true);
            } else if (result.type === 'sudoku.room.update' && result.room) {
              onRoomUpdateRef.current(result.room);
            }
          }
        } catch (e) {
          console.error('Sudoku WS Parse Error', e);
        }
      };

      ws.onclose = () => {
        wsAuthenticatedRef.current = false;
        onConnectedChangeRef.current(false);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Sudoku WS Connect Error', e);
    }
  }, []);

  const callRpc = useCallback((method: string, params: Record<string, unknown>): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open'));
        return;
      }
      const requestId = crypto.randomUUID();
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.id === requestId) {
            wsRef.current?.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        } catch {
          /* parse error */
        }
      };
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: requestId,
          method,
          params,
        })
      );
    });
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsAuthenticatedRef.current = false;
      onConnectedChangeRef.current(false);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { wsRef, callRpc, wsAuthenticatedRef };
}
