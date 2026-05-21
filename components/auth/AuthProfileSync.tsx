'use client';

import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef } from 'react';

import { useAuthSession } from '@/components/auth/AuthSessionContext';
import { notifyAuthSessionChanged } from '@/lib/auth-session-events';
import { canRunAuthedGraphqlQueries } from '@/lib/auth-graphql-ready';
import { mergeStoredUser, readStoredUser } from '@/lib/auth-tokens-local';
import { ME } from '@/lib/graphql-modules';

const MAX_ATTEMPTS = 4;
const RETRY_MS = 800;

function storedUserMatchesMe(me: { id: string; email: string | null }): boolean {
  const u = readStoredUser();
  if (!u?.id || u.id !== me.id) return false;
  const meEmail = me.email?.trim() ?? '';
  const storedEmail = u.email?.trim() ?? '';
  return meEmail === storedEmail;
}

/** Fetch `me` over the network after tokens exist; heals stale Apollo cache and fills stored user. */
export function AuthProfileSync() {
  const client = useApolloClient();
  const { authenticated, recheck } = useAuthSession();
  const generationRef = useRef(0);
  const cacheClearedRef = useRef(false);

  const syncProfile = useCallback(async () => {
    if (!canRunAuthedGraphqlQueries()) return false;

    const gen = ++generationRef.current;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (generationRef.current !== gen) return false;
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_MS * attempt));
      }

      try {
        if (!cacheClearedRef.current) {
          client.cache.evict({ fieldName: 'me' });
          client.cache.gc();
          cacheClearedRef.current = true;
        }

        const { data, error } = await client.query({
          query: ME,
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });

        if (generationRef.current !== gen) return false;

        const me = data?.me;
        if (me?.id) {
          const changed = !storedUserMatchesMe(me);
          if (changed) {
            mergeStoredUser({ id: me.id, email: me.email ?? null });
            notifyAuthSessionChanged();
            await recheck();
          }
          return true;
        }

        if (error) break;
      } catch {
        /* retry */
      }
    }
    return false;
  }, [client, recheck]);

  useEffect(() => {
    if (!authenticated) {
      cacheClearedRef.current = false;
      return;
    }
    void syncProfile();
  }, [authenticated, syncProfile]);

  return null;
}
