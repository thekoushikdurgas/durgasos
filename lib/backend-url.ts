/**
 * Resolve ai.backend base URL (no trailing slash) and HTTP GraphQL URL for the browser.
 * Use the same hostname for backend and Next (e.g. localhost, not mixed with 127.0.0.1)
 * so session cookies apply to both origins.
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

export function getGraphqlHttpUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
  if (explicit) {
    return explicit;
  }
  return `${getBackendOrigin()}/graphql`;
}

export function getSessionUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth/session`;
  }
  return `${getBackendOrigin()}/api/auth/session`;
}

/**
 * WebSocket URL for ai.backend JSON-RPC gateway (`/ws/gateway`).
 * Prefer JWT from the logged-in session; optional `NEXT_PUBLIC_AI_WS_API_KEY` for local dev.
 */
export function getAiWebSocketGatewayUrl(options?: {
  accessToken?: string | null;
  apiKey?: string | null;
}): string {
  const httpOrigin = getBackendOrigin();
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
