'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';

import { enhancePrompt, generateCetoPrompts } from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { CopyButton, LoadingState, ToolPanel } from './shared';

type Mode = 'enhancer' | 'ceto';

export function PromptEnhancerTab() {
  const [mode, setMode] = useState<Mode>('enhancer');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setOutput(
        mode === 'enhancer' ? await enhancePrompt(input) : await generateCetoPrompts(input)
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel
      title="Prompt Enhancer"
      description="Enhance prompts or generate CETO-structured prompts."
    >
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className={`${styles.btn} ${mode === 'enhancer' ? '' : styles.btnSecondary}`}
          onClick={() => setMode('enhancer')}
        >
          Enhancer
        </button>
        <button
          type="button"
          className={`${styles.btn} ${mode === 'ceto' ? '' : styles.btnSecondary}`}
          onClick={() => setMode('ceto')}
        >
          CETO
        </button>
      </div>
      <textarea
        className={styles.textarea}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        type="button"
        className={`${styles.btn} mt-2`}
        disabled={loading}
        onClick={() => void run()}
      >
        <Sparkles className="h-4 w-4" />
        {mode === 'enhancer' ? 'Enhance' : 'Generate CETO'}
      </button>
      {loading && <LoadingState />}
      {error && <p className={styles.error}>{error}</p>}
      {output && (
        <>
          <CopyButton text={output} />
          {mode === 'ceto' ? (
            <article className="prose prose-invert prose-sm max-w-none mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            </article>
          ) : (
            <pre className={styles.output}>{output}</pre>
          )}
        </>
      )}
    </ToolPanel>
  );
}
