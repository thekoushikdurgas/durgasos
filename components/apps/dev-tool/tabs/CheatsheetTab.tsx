'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';

import { generateCheatsheet } from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { LoadingState, ToolPanel } from './shared';

export function CheatsheetTab() {
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setOutput(await generateCheatsheet(topic));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel
      title="AI Cheatsheets"
      description="Generate markdown cheatsheets for any dev topic."
    >
      <input
        className="w-full rounded bg-slate-800 border border-slate-600 px-3 py-2 text-sm mb-2"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. React hooks, Docker commands"
      />
      <button type="button" className={styles.btn} disabled={loading} onClick={() => void run()}>
        <Sparkles className="h-4 w-4" />
        Generate
      </button>
      {loading && <LoadingState />}
      {error && <p className={styles.error}>{error}</p>}
      {output && (
        <article className="prose prose-invert prose-sm max-w-none mt-4 p-4 rounded border border-slate-700 bg-slate-900/50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
        </article>
      )}
    </ToolPanel>
  );
}
