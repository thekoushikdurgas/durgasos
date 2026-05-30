'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { minifyCode } from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { CopyButton, LoadingState, ToolPanel } from './shared';

export function CodeMinifierTab() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setOutput(await minifyCode(code, language));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel
      title="Code Minifier"
      description="AI-powered minification for JS, CSS, HTML, and more."
    >
      <div className="flex gap-2 mb-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded bg-slate-800 border border-slate-600 text-sm px-2 py-1"
        >
          {['JavaScript', 'TypeScript', 'CSS', 'HTML', 'JSON', 'Python'].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button type="button" className={styles.btn} disabled={loading} onClick={() => void run()}>
          <Sparkles className="h-4 w-4" />
          Minify
        </button>
      </div>
      <textarea
        className={styles.textarea}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste code here…"
      />
      {loading && <LoadingState />}
      {error && <p className={styles.error}>{error}</p>}
      {output && (
        <div>
          <div className="flex gap-2 mt-2 mb-1">
            <CopyButton text={output} />
          </div>
          <pre className={styles.output}>{output}</pre>
        </div>
      )}
    </ToolPanel>
  );
}
