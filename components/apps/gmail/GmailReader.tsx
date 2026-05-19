'use client';

import { ExternalLink, Flag, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  gmailWebThreadUrl,
  parseMessageForReader,
  pickLatestThreadMessage,
} from '@/lib/gmail-format';
import { cn } from '@/lib/utils';

type GmailReaderProps = {
  threadId: string | null;
  threadJson: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
};

export function GmailReader({ threadId, threadJson, loading, error }: GmailReaderProps) {
  const [showDebug, setShowDebug] = useState(false);
  const fields = useMemo(() => {
    const msg = pickLatestThreadMessage(threadJson) as Record<string, unknown> | null;
    return parseMessageForReader(msg);
  }, [threadJson]);

  const webUrl = threadId ? gmailWebThreadUrl(threadId) : '';

  if (!threadId) {
    return (
      <section
        className="flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/30 p-6 text-sm text-white/40"
        aria-label="Message"
      >
        Select a conversation to read.
      </section>
    );
  }

  if (loading && !threadJson) {
    return (
      <section
        className="flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/30 p-6 text-sm text-white/45"
        aria-label="Message"
      >
        Loading conversation…
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-2xl border border-red-500/20 bg-red-950/20 p-6 text-sm text-red-200/90"
        aria-label="Message"
      >
        {error}
      </section>
    );
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-inner"
      aria-label="Message"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-white/10 px-2 py-2 md:px-3">
        <a
          href={webUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-sky-300/90 hover:bg-white/10"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Open in Gmail
        </a>
        <button
          type="button"
          className="ml-auto text-[11px] text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
          onClick={() => setShowDebug((v) => !v)}
        >
          {showDebug ? 'Hide' : 'Show'} debug JSON
        </button>
      </div>

      {fields ? (
        <>
          <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4 md:pl-14">
            <div className="flex flex-wrap items-start gap-2">
              <h2 className="text-lg font-medium leading-snug text-white/95 md:text-xl">
                {fields.subject}
              </h2>
              {fields.important ? (
                <Flag className="mt-1 h-4 w-4 shrink-0 text-amber-400/90" aria-label="Important" />
              ) : null}
              {fields.starred ? (
                <Star
                  className="mt-1 h-4 w-4 shrink-0 fill-amber-400/80 text-amber-400"
                  aria-label="Starred"
                />
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 md:pl-14">
            <div className="flex gap-3 border-b border-white/5 pb-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/40 to-violet-500/30 text-sm font-semibold text-white/90"
                aria-hidden
              >
                {(fields.fromDisplay[0] ?? '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">{fields.fromDisplay}</p>
                    {fields.fromEmail ? (
                      <p className="text-xs text-white/45">
                        {'<'}
                        {fields.fromEmail}
                        {'>'}
                      </p>
                    ) : null}
                    {fields.toLine ? (
                      <p className="mt-1 text-xs text-white/50">To: {fields.toLine}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-white/45">{fields.dateLine}</p>
                </header>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {fields.snippet}
                </p>
                <p className="mt-3 text-[11px] text-white/35">
                  Full body is not loaded (metadata-only). Use Open in Gmail to reply or read HTML.
                </p>
              </div>
            </div>
            <footer className="mt-6 flex flex-wrap gap-2">
              <a
                href={webUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-xs text-white/85 hover:bg-white/10"
              >
                Reply in Gmail
              </a>
              <a
                href={webUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-xs text-white/85 hover:bg-white/10"
              >
                Forward in Gmail
              </a>
            </footer>
          </div>
        </>
      ) : (
        <p className="p-6 text-sm text-white/45">No messages in this thread.</p>
      )}

      {showDebug && threadJson ? (
        <pre
          className={cn(
            'max-h-48 shrink-0 overflow-auto border-t border-white/10 bg-black/40 p-3 font-mono text-[10px] text-white/50'
          )}
        >
          {JSON.stringify(threadJson, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
