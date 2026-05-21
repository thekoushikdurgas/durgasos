'use client';

import { useApolloClient } from '@apollo/client/react';
import { useEffect } from 'react';

import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { backgroundSync } from '@/lib/background-sync';

/** Starts periodic background prefetch when auth is ready. */
export function BackgroundSyncHost() {
  const client = useApolloClient();
  const { authenticated, ready } = useAuthSession();

  useEffect(() => {
    if (!ready) return;
    backgroundSync.start(client, authenticated);
    return () => backgroundSync.stop();
  }, [client, authenticated, ready]);

  return null;
}
