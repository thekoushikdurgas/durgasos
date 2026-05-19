'use client';

import { Terminal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useJsonRpcStream } from '@/hooks/use-json-rpc-ws';
import { useWorkflowRunner } from '@/hooks/use-workflow';
import { cn } from '@/lib/utils';

type LineType = 'sys' | 'cmd' | 'res' | 'stream';

type HistoryLine = { type: LineType; content: string };

const HELP_TEXT = `Commands:
  help              Show this message
  clear             Clear transcript
  echo <text>       Print text
  date              Show date/time
  whoami            Show shell user
  feed <topic>      Stream system.feed over WebSocket (topic optional)
  workflow <id>     Run workflow.run for persisted workflow id
  health            Placeholder (use Settings → System health for GraphQL)`;

export function TerminalApp() {
  const { callStreaming } = useJsonRpcStream();
  const { runWorkflow } = useWorkflowRunner();
  const [history, setHistory] = useState<HistoryLine[]>([
    { type: 'sys', content: 'DurgasOS shell — type "help" for commands.' },
  ]);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const streamScrollRef = useRef<HTMLDivElement>(null);

  const scrollMainPane = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  }, []);

  const scrollStreamPane = useCallback(() => {
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  }, []);

  useEffect(() => {
    scrollMainPane();
  }, [history, scrollMainPane]);

  useEffect(() => {
    scrollStreamPane();
  }, [streamLines, scrollStreamPane]);

  const appendStream = useCallback((line: string) => {
    setStreamLines((prev) => [...prev.slice(-200), line]);
  }, []);

  const handleCommand = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !input.trim()) return;
      const raw = input.trim();
      setHistory((prev) => [...prev, { type: 'cmd', content: `$ ${raw}` }]);
      setInput('');

      const lower = raw.toLowerCase();
      if (lower === 'help') {
        setHistory((prev) => [...prev, { type: 'res', content: HELP_TEXT }]);
        return;
      }
      if (lower === 'clear') {
        setHistory([]);
        setStreamLines([]);
        return;
      }
      if (lower.startsWith('echo ')) {
        setHistory((prev) => [...prev, { type: 'res', content: raw.slice(5) }]);
        return;
      }
      if (lower === 'date') {
        setHistory((prev) => [...prev, { type: 'res', content: new Date().toString() }]);
        return;
      }
      if (lower === 'whoami') {
        setHistory((prev) => [...prev, { type: 'res', content: 'durgasos-terminal' }]);
        return;
      }
      if (lower === 'health') {
        setHistory((prev) => [
          ...prev,
          {
            type: 'res',
            content: 'Use Settings → System health for live GraphQL systemHealth / systemReady.',
          },
        ]);
        return;
      }

      if (lower.startsWith('feed')) {
        const topic = raw.slice(4).trim() || 'default';
        appendStream(`— starting system.feed topic="${topic}"`);
        try {
          await callStreaming(
            'system.feed',
            { topic },
            {
              onMessage: (msg) => appendStream(JSON.stringify(msg)),
              onDone: (summary) => appendStream(`done: ${JSON.stringify(summary)}`),
              onError: (err) => appendStream(`error: ${err}`),
            }
          );
        } catch (err) {
          appendStream(`closed: ${err instanceof Error ? err.message : String(err)}`);
        }
        return;
      }

      if (lower.startsWith('workflow')) {
        const id = raw.slice('workflow'.length).trim();
        if (!id) {
          setHistory((prev) => [
            ...prev,
            { type: 'res', content: 'usage: workflow <workflow_id>' },
          ]);
          return;
        }
        appendStream(`— starting workflow.run id="${id}"`);
        try {
          await runWorkflow(id, {
            onMessage: (msg) => appendStream(JSON.stringify(msg)),
            onDone: (summary) => appendStream(`done: ${JSON.stringify(summary)}`),
            onError: (err) => appendStream(`error: ${err}`),
          });
        } catch (err) {
          appendStream(`closed: ${err instanceof Error ? err.message : String(err)}`);
        }
        return;
      }

      setHistory((prev) => [
        ...prev,
        { type: 'res', content: `command not found: ${raw.split(/\s+/)[0]}` },
      ]);
    },
    [input, appendStream, callStreaming, runWorkflow]
  );

  return (
    <div className="absolute inset-0 flex bg-[#0d1117] font-mono text-sm text-green-400">
      <div className="flex min-w-0 flex-1 flex-col border-r border-white/10">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-2 text-xs text-white/60">
          <Terminal className="h-4 w-4 text-green-500/90" aria-hidden />
          <span>Session</span>
        </div>
        <div ref={mainScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {history.map((line, i) => (
            <div
              key={i}
              className={cn(
                'mb-1 whitespace-pre-wrap',
                line.type === 'sys' && 'text-slate-500',
                line.type === 'cmd' && 'text-sky-400',
                line.type === 'res' && 'text-green-400/95',
                line.type === 'stream' && 'text-emerald-300/90'
              )}
            >
              {line.content}
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sky-400">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(ev) => void handleCommand(ev)}
              className="min-w-0 flex-1 bg-transparent text-green-400 outline-none ring-0 placeholder:text-green-900"
              autoFocus
              spellCheck={false}
              aria-label="Terminal input"
            />
          </div>
        </div>
      </div>
      <div className="flex w-[min(40%,22rem)] shrink-0 flex-col bg-black/50">
        <div className="flex shrink-0 items-center border-b border-white/10 bg-black/40 px-3 py-2 text-xs text-white/55">
          WebSocket stream
        </div>
        <div
          ref={streamScrollRef}
          className="min-h-0 flex-1 overflow-y-auto p-3 text-[11px] leading-relaxed text-emerald-200/85"
        >
          {streamLines.length === 0 ? (
            <span className="text-white/35">Output from `feed` and `workflow`…</span>
          ) : (
            streamLines.map((l, i) => (
              <div
                key={i}
                className="mb-1 break-all border-b border-white/5 pb-1 font-mono text-[10px] last:border-0"
              >
                {l}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
