import { print } from 'graphql';

import { getGraphqlHttpUrl } from '@/lib/backend-url';
import { REFRESH_SESSION } from '@/lib/graphql-auth';

export type RefreshedSessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | null | undefined;
};

type RefreshResponse = {
  data?: {
    refreshSession?: {
      success?: boolean;
      session?: {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number | null;
      } | null;
    } | null;
  };
};

/** Exchange a refresh JWT for a new access/refresh pair via ai.backend GraphQL. */
export async function refreshSessionViaGraphql(
  refreshToken: string
): Promise<RefreshedSessionTokens | null> {
  const res = await fetch(getGraphqlHttpUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      query: print(REFRESH_SESSION),
      variables: { refreshToken },
    }),
  });
  if (!res.ok) return null;
  const raw = await res.text();
  if (!raw.trimStart().startsWith('{')) {
    return null;
  }
  const json = JSON.parse(raw) as RefreshResponse;
  const payload = json.data?.refreshSession;
  const sess = payload?.session;
  if (!payload?.success || !sess?.accessToken || !sess?.refreshToken) return null;
  return {
    accessToken: sess.accessToken,
    refreshToken: sess.refreshToken,
    expiresIn: sess.expiresIn,
  };
}
