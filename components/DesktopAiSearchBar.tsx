'use client';

import { useCallback, useState } from 'react';
import { X } from 'lucide-react';

import { AIChatInput, type AIChatSubmitPayload } from '@/components/ui/ai-chat-input';
import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { cn } from '@/lib/utils';

export function DesktopAiSearchBar() {
  const { sendCompletion, abortActiveRequests } = useAiChatGateway();
  const [streaming, setStreaming] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stoppedByUser, setStoppedByUser] = useState(false);

  const clearReply = useCallback(() => {
    setReply('');
    setError(null);
    setStoppedByUser(false);
  }, []);

  const handleStop = useCallback(() => {
    abortActiveRequests();
  }, [abortActiveRequests]);

  const handleSubmit = useCallback(
    (payload: AIChatSubmitPayload) => {
      setError(null);
      setStoppedByUser(false);
      setReply('');
      setStreaming(true);

      return new Promise<void>((resolve, reject) => {
        sendCompletion(
          {
            message: payload.text,
            think: payload.think,
            deepSearch: payload.deepSearch,
          },
          {
            onChunk: (_d, full) => {
              setReply(full);
            },
            onDone: (full) => {
              setReply(full);
              setStreaming(false);
              resolve();
            },
            onError: (msg) => {
              setError(msg);
              setStreaming(false);
              reject(new Error(msg));
            },
            onAborted: () => {
              setStreaming(false);
              setStoppedByUser(true);
              reject(new DOMException('Aborted', 'AbortError'));
            },
          }
        );
      });
    },
    [sendCompletion]
  );

  const replyStatusLabel = error
    ? 'Error'
    : streaming
      ? 'Streaming…'
      : stoppedByUser
        ? 'Stopped'
        : 'Reply';

  return (
    <div
      className="pointer-events-auto absolute top-12 left-1/2 z-[52] w-[min(100%-1.5rem,40rem)] max-w-3xl -translate-x-1/2"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="search"
      aria-label="AI assistant"
    >
      <div className="flex flex-col gap-2">
        <AIChatInput
          disabled={streaming}
          streaming={streaming}
          onStop={handleStop}
          onSubmit={handleSubmit}
        />
        <p className="sr-only">Enter to send. Shift+Enter for a new line.</p>
        <p className="text-center text-[10px] text-slate-500/70">Enter to send · Shift+Enter newline</p>
        {(reply || error || stoppedByUser) && (
          <div
            className={cn(
              'max-h-40 overflow-y-auto rounded-2xl border border-white/10 px-3 py-2 text-sm shadow-xl backdrop-blur-md',
              error ? 'bg-red-950/50 text-red-100' : 'bg-slate-950/60 text-slate-200'
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                {replyStatusLabel}
              </span>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                title="Clear reply"
                aria-label="Clear reply"
                onClick={clearReply}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <p className="text-[13px] leading-snug break-words whitespace-pre-wrap">
              {error ?? reply ?? (stoppedByUser ? 'Generation stopped.' : '')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
