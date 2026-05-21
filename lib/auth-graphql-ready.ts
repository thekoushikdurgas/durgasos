import { readStoredAuthTokens } from '@/lib/auth-tokens-local';

/**
 * Whether authed GraphQL queries (ME, settings, etc.) should run.
 * Apollo sends Bearer only from localStorage — httpOnly cookies are not sent to ai.backend.
 */
export function canRunAuthedGraphqlQueries(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(readStoredAuthTokens());
}
