'use client';

import { useCallback, useState } from 'react';
import { X } from 'lucide-react';

import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';
import { AIChatInput, type AIChatSubmitPayload } from '@/components/ui/ai-chat-input';
import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { cn } from '@/lib/utils';

export function AiSearchWidget() {
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
            model: payload.model,
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
    <DesktopWidgetChrome
      maxWidthClass="max-w-[min(100vw-2rem,42rem)]"
      contentClassName="gap-2"
      className="w-full"
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="search"
        aria-label="AI assistant"
        className="flex min-w-0 flex-col gap-2"
      >
        <AIChatInput
          disabled={streaming}
          streaming={streaming}
          onStop={handleStop}
          onSubmit={handleSubmit}
        />
        {(reply || error || stoppedByUser) && (
          <div
            className={cn(
              'max-h-40 overflow-y-auto rounded-xl border px-3 py-2 text-sm',
              error
                ? 'border-red-400/30 bg-red-950/40 text-red-100'
                : 'border-white/12 bg-white/5 text-white/90'
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
                {replyStatusLabel}
              </span>
              <button
                type="button"
                className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white"
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
    </DesktopWidgetChrome>
  );
}
