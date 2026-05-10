'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  CHAT_COMPLETION,
  CHAT_CONVERSATIONS,
  CHAT_PROVIDERS,
  SYSTEM_READY,
} from '@/lib/graphql-modules';
import { ModuleAppShell, JsonBlock } from '@/components/apps/ModuleAppShell';
import { useState } from 'react';

export function ChatApp() {
  const [message, setMessage] = useState('Hello from DurgasOS');
  const [last, setLast] = useState<unknown>(null);
  const [err, setErr] = useState<Error | null>(null);

  const providers = useQuery(CHAT_PROVIDERS);
  const conversations = useQuery(CHAT_CONVERSATIONS, { variables: { limit: 20 } });
  const ready = useQuery(SYSTEM_READY);
  const [complete, { loading }] = useMutation(CHAT_COMPLETION);

  return (
    <ModuleAppShell title="Chat" subtitle="GraphQL: chatCompletion, chatProviders, conversations">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          onClick={() => ready.refetch()}
        >
          Ping systemReady
        </button>
        <JsonBlock
          data={{
            systemReady: (ready.data as Record<string, unknown> | undefined)?.systemReady,
          }}
          error={ready.error ?? undefined}
        />

        <button
          type="button"
          className="self-start rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          onClick={() => providers.refetch()}
        >
          Load chatProviders
        </button>
        <JsonBlock
          data={(providers.data as Record<string, unknown> | undefined)?.chatProviders}
          error={providers.error ?? undefined}
        />

        <button
          type="button"
          className="self-start rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          onClick={() => conversations.refetch()}
        >
          Load chatConversations
        </button>
        <JsonBlock
          data={(conversations.data as Record<string, unknown> | undefined)?.chatConversations}
          error={conversations.error ?? undefined}
        />

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/60">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[72px] rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          className="self-start rounded-lg bg-cyan-600/80 px-4 py-2 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
          onClick={async () => {
            setErr(null);
            try {
              const res = await complete({
                variables: {
                  params: { message, stream: false },
                },
              });
              setLast((res.data as Record<string, unknown> | undefined)?.chatCompletion ?? res);
            } catch (e) {
              setErr(e instanceof Error ? e : new Error(String(e)));
            }
          }}
        >
          {loading ? 'Sending…' : 'chatCompletion'}
        </button>
        <JsonBlock data={last} error={err} />
      </div>
    </ModuleAppShell>
  );
}
