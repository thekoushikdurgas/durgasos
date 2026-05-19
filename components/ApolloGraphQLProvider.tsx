'use client';

import { ApolloClient, from, HttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { ApolloProvider } from '@apollo/client/react';
import { useMemo } from 'react';

import { AuthSessionProvider } from '@/components/auth/AuthSessionContext';
import { WelcomeModal } from '@/components/auth/WelcomeModal';
import { getGraphqlHttpUrl } from '@/lib/backend-url';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';

function makeClient() {
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
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: from([authLink, httpLink]),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network', nextFetchPolicy: 'cache-first' },
      query: { fetchPolicy: 'network-only' },
    },
  });
}

export function ApolloGraphQLProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => makeClient(), []);
  return (
    <ApolloProvider client={client}>
      <AuthSessionProvider>
        <WelcomeModal />
        {children}
      </AuthSessionProvider>
    </ApolloProvider>
  );
}
