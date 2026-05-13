'use client';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { useMemo } from 'react';

import { AuthSessionRestore } from '@/components/auth/AuthSessionRestore';
import { getGraphqlHttpUrl } from '@/lib/backend-url';

function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: getGraphqlHttpUrl(),
      credentials: 'include',
    }),
    defaultOptions: {
      query: { fetchPolicy: 'network-only' },
    },
  });
}

export function ApolloGraphQLProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => makeClient(), []);
  return (
    <ApolloProvider client={client}>
      <AuthSessionRestore />
      {children}
    </ApolloProvider>
  );
}
