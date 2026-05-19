'use client';

import { cn } from '@/lib/utils';

export type GmailThreadRow = {
  id?: string;
  snippet?: string;
  historyId?: string;
};

type GmailListProps = {
  threads: GmailThreadRow[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  loading: boolean;
  error: string | null;
  nextPageToken: string | null;
  onLoadMore: () => void;
};

export function GmailList({
  threads,
  selectedThreadId,
  onSelectThread,
  loading,
  error,
  nextPageToken,
  onLoadMore,
}: GmailListProps) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-inner md:max-w-[min(100%,28rem)]"
      aria-label="Conversation list"
    >
      <div className="flex h-10 shrink-0 items-center border-b border-white/10 px-3">
        <span className="text-[11px] text-white/45">
          {threads.length ? `${threads.length} conversations` : ''}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <p className="p-4 text-xs text-red-300/90">{error}</p>
        ) : loading && threads.length === 0 ? (
          <p className="p-4 text-xs text-white/40">Loading…</p>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-white/45">
            <span>No messages matched your search.</span>
          </div>
        ) : (
          <ul role="listbox" aria-label="Threads" className="divide-y divide-white/[0.06]">
            {threads.map((t) => {
              const id = typeof t.id === 'string' ? t.id : null;
              if (!id) return null;
              const snippet = typeof t.snippet === 'string' ? t.snippet : '';
              const selected = selectedThreadId === id;
              return (
                <li key={id} className="list-none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected ? 'true' : 'false'}
                    title={id}
                    onClick={() => onSelectThread(id)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition',
                      selected
                        ? 'bg-blue-500/25 ring-1 ring-inset ring-sky-500/30'
                        : 'hover:bg-white/[0.05] hover:shadow-[inset_0_-1px_0_0_rgba(100,121,143,0.12)]'
                    )}
                  >
                    <span className="line-clamp-2 text-[13px] leading-snug text-white/85">
                      {snippet || '(no preview)'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {nextPageToken && threads.length > 0 ? (
          <div className="border-t border-white/10 p-2">
            <button
              type="button"
              disabled={loading}
              className="w-full rounded-lg border border-white/10 py-2 text-[11px] text-white/65 hover:bg-white/5 disabled:opacity-50"
              onClick={onLoadMore}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
