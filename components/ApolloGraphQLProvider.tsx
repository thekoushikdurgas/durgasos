'use client';

import { ApolloClient, from, HttpLink, InMemoryCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { ApolloProvider } from '@apollo/client/react';
import { useEffect, useMemo } from 'react';

import { AuthProfileSync } from '@/components/auth/AuthProfileSync';
import { AuthSessionProvider } from '@/components/auth/AuthSessionContext';
import { WelcomeModal } from '@/components/auth/WelcomeModal';
import { CLEAR_APOLLO_CACHE_EVENT } from '@/lib/apollo-cache-events';
import {
  clearApolloPersistStorage,
  restoreApolloCacheFromStorage,
  subscribeApolloCachePersist,
} from '@/lib/apollo-persist';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { getGraphqlHttpUrl } from '@/lib/backend-url';

function makeClient(cache: InMemoryCache) {
  /** Backend GraphQL is often a different origin than the Next app; httpOnly cookies set on the app host are not sent. Mirror WS/chat by sending the access JWT from the same localStorage pair used after sign-in. */
  const authLink = setContext((_, prev) => {
    const headers = { ...(prev.headers as Record<string, string | undefined>) };
    if (typeof window !== 'undefined') {
      const tok = readStoredAuthTokens()?.access?.trim();
      if (tok) {
        headers.authorization = `Bearer ${tok}`;
      }
    }
    return { headers };
  });

  const httpLink = new HttpLink({
    uri: getGraphqlHttpUrl(),
    credentials: 'include',
  });

  const errorLink = onError(({ error }) => {
    if (process.env.NODE_ENV !== 'development' || !error) return;
    const msg = error.message ?? '';
    if (msg.includes('Failed to fetch') || msg.includes('503') || msg.includes('fetch')) {
      console.warn(
        '[GraphQL] Backend unreachable — start ai.backend (port 8000) or set NEXT_PUBLIC_BACKEND_URL.'
      );
    }
    const ext = (error as { extensions?: { code?: string } }).extensions;
    if (ext?.code === 'BACKEND_UNAVAILABLE') {
      console.warn('[GraphQL] Backend unavailable. Using cached data where possible.');
    }
  });

  return new ApolloClient({
    cache,
    link: from([errorLink, authLink, httpLink]),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network', nextFetchPolicy: 'cache-first' },
      /** AC v4: `query` default only allows `FetchPolicy` (not `cache-and-network`). */
      query: { fetchPolicy: 'cache-first' },
    },
  });
}

export function ApolloGraphQLProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const cache = new InMemoryCache();
    restoreApolloCacheFromStorage(cache);
    return makeClient(cache);
  }, []);

  useEffect(() => {
    return subscribeApolloCachePersist(client.cache);
  }, [client]);

  useEffect(() => {
    const onClear = () => {
      clearApolloPersistStorage();
      void client.clearStore();
    };
    window.addEventListener(CLEAR_APOLLO_CACHE_EVENT, onClear);
    return () => window.removeEventListener(CLEAR_APOLLO_CACHE_EVENT, onClear);
  }, [client]);

  return (
    <ApolloProvider client={client}>
      <AuthSessionProvider>
        <AuthProfileSync />
        <WelcomeModal />
        {children}
      </AuthSessionProvider>
    </ApolloProvider>
  );
}
