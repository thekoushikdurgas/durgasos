'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { swallowClientError } from '@/lib/safe-client-storage';

export type IdeThreadSummary = {
  id: string;
  title: string;
  updatedAt?: string;
  messageCount?: number;
};

export type IdeChatTurn = { role: 'user' | 'assistant'; content: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object';
}

export type IdeThreadsCallRpc = (
  method: string,
  params: Record<string, unknown>
) => Promise<unknown>;

function createSeedThread(): IdeThreadSummary {
  const id = crypto.randomUUID();
  return {
    id,
    title: 'New chat',
    updatedAt: new Date().toISOString(),
    messageCount: 0,
  };
}

type ThreadShell = {
  threads: IdeThreadSummary[];
  activeThreadId: string;
};

/**
 * Multi-thread UI state + list/hydrate/delete via `chat.conversations.*` JSON-RPC.
 */
export function useIdeThreads(callRpc: IdeThreadsCallRpc) {
  const [shell, setShell] = useState<ThreadShell>(() => {
    const t = createSeedThread();
    return { threads: [t], activeThreadId: t.id };
  });
  const { threads, activeThreadId } = shell;

  const [listLoading, setListLoading] = useState(false);
  const titleByIdRef = useRef<Map<string, string>>(new Map());

  const deriveTitle = useCallback((id: string) => {
    const stored = titleByIdRef.current.get(id);
    if (stored?.trim()) return stored.trim().slice(0, 56);
    return `Chat ${id.slice(0, 8)}`;
  }, []);

  const refreshThreadList = useCallback(async () => {
    await Promise.resolve();
    setListLoading(true);
    try {
      const raw = await callRpc('chat.conversations.list', { limit: 50 });
      if (!isRecord(raw)) return;
      const arr = raw.conversations;
      if (!Array.isArray(arr)) return;
      const fromServer: IdeThreadSummary[] = arr
        .filter(isRecord)
        .map((c) => {
          const id = typeof c.id === 'string' ? c.id : '';
          const updatedAt = typeof c.updated_at === 'string' ? c.updated_at : undefined;
          const messageCount = typeof c.message_count === 'number' ? c.message_count : undefined;
          const title = titleByIdRef.current.get(id) ?? deriveTitle(id);
          return { id, title, updatedAt, messageCount };
        })
        .filter((t) => t.id.length > 0);

      setShell((prev) => {
        const serverIds = new Set(fromServer.map((s) => s.id));
        const pendingNew = prev.threads.filter(
          (p) => p.title === 'New chat' && !serverIds.has(p.id)
        );
        const merged = [...pendingNew, ...fromServer];
        merged.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
        return { ...prev, threads: merged };
      });
    } catch (err) {
      swallowClientError('ide-threads.refreshList', err);
    } finally {
      setListLoading(false);
    }
  }, [callRpc, deriveTitle]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshThreadList();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refreshThreadList]);

  const createNewThread = useCallback(() => {
    const id = crypto.randomUUID();
    titleByIdRef.current.set(id, 'New chat');
    setShell((s) => ({
      activeThreadId: id,
      threads: [
        { id, title: 'New chat', updatedAt: new Date().toISOString(), messageCount: 0 },
        ...s.threads.filter((x) => x.id !== id),
      ],
    }));
    return id;
  }, []);

  const selectThread = useCallback((id: string) => {
    setShell((s) => ({ ...s, activeThreadId: id }));
  }, []);

  const deleteThread = useCallback(
    async (id: string) => {
      try {
        await callRpc('chat.conversations.delete', { conversation_id: id });
      } catch {
        /* still drop locally */
      }
      titleByIdRef.current.delete(id);
      setShell((s) => {
        const nextThreads = s.threads.filter((x) => x.id !== id);
        if (s.activeThreadId !== id) {
          return { ...s, threads: nextThreads };
        }
        const n = crypto.randomUUID();
        titleByIdRef.current.set(n, 'New chat');
        const row: IdeThreadSummary = {
          id: n,
          title: 'New chat',
          updatedAt: new Date().toISOString(),
          messageCount: 0,
        };
        return {
          activeThreadId: n,
          threads: [row, ...nextThreads.filter((x) => x.id !== n)],
        };
      });
    },
    [callRpc]
  );

  const loadThreadMessages = useCallback(
    async (conversationId: string): Promise<IdeChatTurn[]> => {
      try {
        const raw = await callRpc('chat.conversations.get', { conversation_id: conversationId });
        if (!isRecord(raw)) return [];
        const messages = raw.messages;
        if (!Array.isArray(messages)) return [];
        const out: IdeChatTurn[] = [];
        for (const m of messages) {
          if (!isRecord(m)) continue;
          const role = m.role === 'user' || m.role === 'assistant' ? m.role : null;
          const content = typeof m.content === 'string' ? m.content : '';
          if (role && content) out.push({ role, content });
        }
        return out;
      } catch {
        return [];
      }
    },
    [callRpc]
  );

  const setThreadTitleFromMessage = useCallback((threadId: string, firstUserMessage: string) => {
    const line = firstUserMessage.trim().split('\n')[0]?.trim() ?? 'Chat';
    const t = line.slice(0, 56);
    titleByIdRef.current.set(threadId, t);
    setShell((s) => ({
      ...s,
      threads: s.threads.map((x) => (x.id === threadId ? { ...x, title: t } : x)),
    }));
  }, []);

  return {
    threads,
    activeThreadId,
    listLoading,
    refreshThreadList,
    createNewThread,
    selectThread,
    deleteThread,
    loadThreadMessages,
    setThreadTitleFromMessage,
  };
}
