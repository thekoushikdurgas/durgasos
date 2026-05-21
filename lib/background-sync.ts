import type { ApolloClient } from '@apollo/client';

import { fetchBackendHealthSnapshot } from '@/lib/backend-http';
import { dispatchOsLog } from '@/lib/notifications';
import { CHAT_CONVERSATIONS, CHAT_PROVIDERS, INSTALLED_APPS } from '@/lib/graphql-modules';

/**
 * Periodic warm-cache tasks (health + optional Apollo queries when signed in).
 */
export class BackgroundSyncManager {
  private ids: number[] = [];

  private client: ApolloClient | null = null;

  start(client: ApolloClient, authenticated: boolean): void {
    this.stop();
    this.client = client;
    if (typeof window === 'undefined') return;

    void fetchBackendHealthSnapshot().catch(() => {});

    this.ids.push(
      window.setInterval(() => {
        void fetchBackendHealthSnapshot().catch(() => {});
      }, 30_000)
    );

    if (!authenticated) return;

    const warmChat = () => {
      void client
        .query({
          query: CHAT_CONVERSATIONS,
          variables: { limit: 50 },
          fetchPolicy: 'network-only',
        })
        .then(() => {
          dispatchOsLog({
            category: 'sync',
            message: 'Synced chat conversations',
            level: 'debug',
          });
        })
        .catch(() => {});
    };

    const warmProviders = () => {
      void client
        .query({
          query: CHAT_PROVIDERS,
          fetchPolicy: 'network-only',
        })
        .then(() => {
          dispatchOsLog({
            category: 'sync',
            message: 'Synced chat providers',
            level: 'debug',
          });
        })
        .catch(() => {});
    };

    const warmInstalled = () => {
      void client
        .query({
          query: INSTALLED_APPS,
          fetchPolicy: 'network-only',
        })
        .then(() => {
          dispatchOsLog({
            category: 'sync',
            message: 'Synced installed apps',
            level: 'debug',
          });
        })
        .catch(() => {});
    };

    warmChat();
    warmProviders();
    warmInstalled();

    this.ids.push(window.setInterval(warmChat, 60_000));
    this.ids.push(window.setInterval(warmProviders, 600_000));
    this.ids.push(window.setInterval(warmInstalled, 300_000));
  }

  stop(): void {
    for (const id of this.ids) {
      window.clearInterval(id);
    }
    this.ids = [];
    this.client = null;
  }
}

export const backgroundSync = new BackgroundSyncManager();
