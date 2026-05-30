'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { refactorCode } from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { CopyButton, LoadingState, ToolPanel } from './shared';

export function CodeRefactorTab() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [instructions, setInstructions] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setOutput(await refactorCode(code, language, instructions));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel title="AI Refactor" description="Refactor code with custom instructions.">
      <div className="flex flex-wrap gap-2 mb-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded bg-slate-800 border border-slate-600 text-sm px-2 py-1"
        >
          {['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <input
        className="w-full rounded bg-slate-800 border border-slate-600 px-3 py-2 text-sm mb-2"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Refactoring instructions (optional)"
      />
      <textarea
        className={styles.textarea}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        type="button"
        className={`${styles.btn} mt-2`}
        disabled={loading}
        onClick={() => void run()}
      >
        <Sparkles className="h-4 w-4" />
        Refactor
      </button>
      {loading && <LoadingState />}
      {error && <p className={styles.error}>{error}</p>}
      {output && (
        <>
          <CopyButton text={output} />
          <pre className={styles.output}>{output}</pre>
        </>
      )}
    </ToolPanel>
  );
}
