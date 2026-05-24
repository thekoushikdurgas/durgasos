import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getGraphqlHttpUrl } from '@/lib/backend-url';

export type GraphqlPayload = {
  query: string;
  variables?: Record<string, unknown>;
};

/** Authorization header for ai.backend when tokens exist in localStorage (browser only). */
export function buildBackendAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const tok = readStoredAuthTokens()?.access?.trim();
    if (tok) h.Authorization = `Bearer ${tok}`;
  }
  return h;
}

export async function fetchBackendGraphql(
  payload: GraphqlPayload,
  init?: Omit<RequestInit, 'body' | 'method'>
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const auth = buildBackendAuthHeaders();
  for (const [k, v] of Object.entries(auth)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return fetch(getGraphqlHttpUrl(), {
    ...init,
    method: 'POST',
    headers,
    credentials: init?.credentials ?? 'include',
    body: JSON.stringify(payload),
  });
}

const HEALTH_AGG_QUERY = `query BackendHealthSnapshot {
  health: systemHealth(params: {})
  ready: systemReady(params: {})
  ws: websocketGatewayStatus
  hostStats
}`;

export type BackendHealthSnapshot = {
  health: unknown;
  ready: unknown;
  wsGateway: { ok: boolean; status: number; body: unknown };
  hostStats: any;
};

/** Single GraphQL round-trip for status (replaces separate GET /health, /ready, /ws/status). */
export async function fetchBackendHealthSnapshot(
  init?: Omit<RequestInit, 'method' | 'body'>
): Promise<BackendHealthSnapshot> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const auth = buildBackendAuthHeaders();
  for (const [k, v] of Object.entries(auth)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  const res = await fetch(getGraphqlHttpUrl(), {
    ...init,
    method: 'POST',
    headers,
    credentials: init?.credentials ?? 'include',
    body: JSON.stringify({ query: HEALTH_AGG_QUERY }),
  });
  const wsOk = res.ok;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const data = (
    body as { data?: { health?: unknown; ready?: unknown; ws?: unknown; hostStats?: unknown } }
  )?.data;
  const gqlErr = Array.isArray((body as { errors?: unknown })?.errors);
  return {
    health: data?.health ?? null,
    ready: data?.ready ?? null,
    wsGateway: {
      ok: wsOk && !gqlErr,
      status: res.status,
      body: data?.ws ?? body,
    },
    hostStats: data?.hostStats ?? null,
  };
}
