/**
 * Resolve ai.backend base URL (no trailing slash) for **direct** calls (e.g. WebSocket).
 * HTTP GraphQL from the browser uses same-origin `/graphql` (see `getGraphqlHttpUrl`) so
 * Next can rewrite to ai.backend and session cookies apply to the OS host.
 */
export function getBackendOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const graphql = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
  if (graphql) {
    try {
      const u = new URL(graphql);
      const norm = u.pathname.replace(/\/+$/, '') || '/';
      if (norm === '/graphql') {
        return u.origin;
      }
    } catch {
      /* fall through */
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  throw new Error(
    'Set NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_GRAPHQL_URL (path ending in /graphql).'
  );
}

/**
 * Same-origin GraphQL URL (`/graphql` on this app). Next.js rewrites it to ai.backend
 * (`next.config.ts`), so `establishSession` Set-Cookie headers target the OS origin and
 * the Next.js proxy can read `durgas_sb_access`.
 *
 * `GET /api/auth/session` on this app is rewritten the same way for the welcome shell’s
 * session probe (`AuthSessionContext`).
 *
 * `GET /files/...` from GraphQL signed URLs is rewritten to **ai.backend** (see `next.config.ts`).
 *
 * Override: set `NEXT_PUBLIC_GRAPHQL_DIRECT_URL` to a full backend GraphQL URL (skips
 * rewrite; session cookies will not be visible to the Next.js proxy unless same host).
 */
export function getGraphqlHttpUrl(): string {
  const direct = process.env.NEXT_PUBLIC_GRAPHQL_DIRECT_URL?.trim();
  if (direct) return direct;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/graphql`;
  }
  const internal =
    process.env.INTERNAL_GRAPHQL_ORIGIN?.trim() || `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
  return `${internal.replace(/\/$/, '')}/graphql`;
}

/**
 * WebSocket URL for ai.backend JSON-RPC gateway (`/ws/gateway`).
 * Prefer JWT from the logged-in session; optional `NEXT_PUBLIC_AI_WS_API_KEY` for local dev.
 */
export function getAiWebSocketGatewayUrl(options?: {
  accessToken?: string | null;
  apiKey?: string | null;
}): string {
  let httpOrigin = getBackendOrigin();
  if (typeof window !== 'undefined') {
    try {
      const bu = new URL(httpOrigin);
      const pageHost = window.location.hostname;
      if (pageHost === 'localhost' && bu.hostname === '127.0.0.1') {
        bu.hostname = 'localhost';
        httpOrigin = bu.origin;
      } else if (pageHost === '127.0.0.1' && bu.hostname === 'localhost') {
        bu.hostname = '127.0.0.1';
        httpOrigin = bu.origin;
      }
    } catch {
      /* keep getBackendOrigin() */
    }
  }
  const u = new URL(httpOrigin);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = '/ws/gateway';
  u.search = '';
  const token = options?.accessToken?.trim();
  const apiKey = options?.apiKey?.trim() || process.env.NEXT_PUBLIC_AI_WS_API_KEY?.trim();
  if (token) {
    u.searchParams.set('token', token);
  } else if (apiKey) {
    u.searchParams.set('api_key', apiKey);
  }
  return u.toString();
}
