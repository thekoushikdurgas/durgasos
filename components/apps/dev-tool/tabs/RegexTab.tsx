'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Trash2 } from 'lucide-react';

import {
  deleteRegexHistory,
  explainRegex,
  generateAndExplainRegex,
  listRegexHistory,
  saveRegexHistory,
  type RegexHistoryItem,
} from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { LoadingState, ToolPanel } from './shared';

type Mode = 'generate' | 'explain';

export function RegexTab() {
  const [mode, setMode] = useState<Mode>('generate');
  const [input, setInput] = useState('');
  const [regex, setRegex] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RegexHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listRegexHistory());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'generate') {
        const r = await generateAndExplainRegex(input);
        setRegex(r.regex);
        setExplanation(r.explanation);
        await saveRegexHistory({
          mode: 'generate',
          input,
          regex: r.regex,
          explanation: r.explanation,
        });
      } else {
        const text = await explainRegex(input);
        setRegex(input);
        setExplanation(text);
        await saveRegexHistory({
          mode: 'explain',
          input,
          explanation: text,
        });
      }
      await loadHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel title="Regex Generator & Explainer">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className={`${styles.btn} ${mode === 'generate' ? '' : styles.btnSecondary}`}
          onClick={() => setMode('generate')}
        >
          Generate
        </button>
        <button
          type="button"
          className={`${styles.btn} ${mode === 'explain' ? '' : styles.btnSecondary}`}
          onClick={() => setMode('explain')}
        >
          Explain
        </button>
      </div>
      <textarea
        className={styles.textarea}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          mode === 'generate' ? 'Describe what the regex should match…' : 'Paste a regex pattern…'
        }
      />
      <button
        type="button"
        className={`${styles.btn} mt-2`}
        disabled={loading}
        onClick={() => void run()}
      >
        <Sparkles className="h-4 w-4" />
        Run
      </button>
      {loading && <LoadingState />}
      {error && <p className={styles.error}>{error}</p>}
      {regex && mode === 'generate' && <pre className={styles.output}>/{regex}/</pre>}
      {explanation && (
        <article className="prose prose-invert prose-sm max-w-none mt-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
        </article>
      )}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-300 mb-2">History</h3>
          <ul className="space-y-2 text-xs">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex justify-between items-start gap-2 p-2 rounded bg-slate-800/50 border border-slate-700"
              >
                <button
                  type="button"
                  className="text-left flex-1 text-slate-300 hover:text-indigo-300"
                  onClick={() => {
                    setInput(h.input);
                    setRegex(h.regex || '');
                    setExplanation(h.explanation);
                    setMode(h.mode);
                  }}
                >
                  <span className="text-slate-500">{h.mode}</span> — {h.input.slice(0, 60)}
                </button>
                <button
                  type="button"
                  className="text-red-400"
                  onClick={() => void deleteRegexHistory(h.id).then(loadHistory)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ToolPanel>
  );
}
