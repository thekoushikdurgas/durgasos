'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@apollo/client/react';
import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';
import { useOS } from '@/components/os-context';
import { CHAT_CONVERSATIONS } from '@/lib/graphql-modules';
import { getThreadTitle } from '@/lib/chat-thread-titles';
import { cn } from '@/lib/utils';

function subscribeHydration(onStoreChange: () => void): () => void {
  queueMicrotask(onStoreChange);
  return () => {};
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false
  );
}

export function ChatHistoryWidget() {
  const { openApp } = useOS();
  const hydrated = useHydrated();

  const { data, loading, error } = useQuery(CHAT_CONVERSATIONS, {
    skip: !hydrated,
    variables: { limit: 6 },
    pollInterval: 30000,
  });

  const conversations = useMemo(() => {
    const inner = data?.chatConversations as { conversations?: unknown } | undefined;
    if (!inner) return [];
    const list = inner.conversations;
    return Array.isArray(list) ? list.slice(0, 6) : [];
  }, [data]);

  return (
    <DesktopWidgetChrome maxWidthClass="max-w-[min(100vw-2rem,300px)]">
      <ul className="max-h-44 space-y-0 overflow-y-auto [scrollbar-width:thin]">
        {(!hydrated || loading) && conversations.length === 0 ? (
          <li className="py-2 text-xs text-white/55">Loading chats…</li>
        ) : error ? (
          <li className="py-2 text-xs text-red-300/80">Failed to load chats.</li>
        ) : conversations.length === 0 ? (
          <li className="py-2 text-xs text-white/55">Start a conversation in Chat.</li>
        ) : (
          conversations.map((c: { id: string; message_count?: number }) => {
            const displayTitle = getThreadTitle(c.id) || `Chat ${c.id.slice(0, 8)}`;
            return (
              <li key={c.id} className="border-t border-white/10 first:border-t-0 first:pt-0">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-2 py-2 text-left transition',
                    'hover:text-white'
                  )}
                  onClick={() => openApp('chat', { chatThreadId: c.id })}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-white/90">
                    {displayTitle}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium tabular-nums text-white/45">
                    {c.message_count ?? 0}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </DesktopWidgetChrome>
  );
}
