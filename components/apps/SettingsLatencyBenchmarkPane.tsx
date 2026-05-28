'use client';

import { useCallback, useState } from 'react';

import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { cn } from '@/lib/utils';

type LatencyRow = {
  provider: string;
  model?: string;
  stream: boolean;
  ttft_ms?: number | null;
  total_ms: number;
  success: boolean;
  error?: string | null;
};

export function SettingsLatencyBenchmarkPane() {
  const { callRpc } = useAiChatGateway();
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<LatencyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = (await callRpc('benchmark.run', {
        type: 'latency',
      })) as { results?: LatencyRow[] };
      setRows(res?.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Benchmark failed');
    } finally {
      setRunning(false);
    }
  }, [callRpc]);

  return (
    <section className="frost-glass-surface space-y-4 border border-white/10 p-6">
      <h2 className="text-lg font-semibold text-white/90">LLM latency benchmark</h2>
      <p className="text-sm text-white/50">
        Runs the same prompt with stream on/off across fast providers (Groq, Cerebras, SambaNova,
        etc.), matching the Postman LLM API Latency collection methodology.
      </p>
      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className="rounded-lg border border-cyan-500/40 bg-cyan-600/25 px-4 py-2 text-sm font-medium text-cyan-50 hover:bg-cyan-600/35 disabled:opacity-40"
      >
        {running ? 'Running…' : 'Run latency suite'}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Stream</th>
                <th className="px-3 py-2">TTFT (ms)</th>
                <th className="px-3 py-2">Total (ms)</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.provider}-${r.stream}-${i}`} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-cyan-200/90">{r.provider}</td>
                  <td className="px-3 py-2">{r.stream ? 'on' : 'off'}</td>
                  <td className="px-3 py-2">{r.ttft_ms != null ? Math.round(r.ttft_ms) : '—'}</td>
                  <td className="px-3 py-2">{Math.round(r.total_ms)}</td>
                  <td className={cn('px-3 py-2', r.success ? 'text-emerald-300' : 'text-red-300')}>
                    {r.success ? 'ok' : r.error || 'fail'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
