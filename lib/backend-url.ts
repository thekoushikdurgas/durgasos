/**
 * Resolve ai.backend base URL (no trailing slash) for HTTP and WebSocket.
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
 * GraphQL HTTP URL on **ai.backend** (cross-origin from the Next app).
 *
 * Auth uses `Authorization: Bearer` from localStorage (`ApolloGraphQLProvider`, `backend-http.ts`).
 * Ensure ai.backend `CORS_ORIGINS` includes your DurgasOS origin (e.g. `http://localhost:3000`).
 *
 * Session cookies use same-origin `app/api/auth/session` (GET/POST/DELETE).
 * `GET /files/...` signed URLs are proxied to ai.backend under `/files/:path*`.
 */
export function getGraphqlHttpUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/graphql';
  }
  const explicit = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
  if (explicit) return explicit;
  return `${getBackendOrigin()}/graphql`;
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
