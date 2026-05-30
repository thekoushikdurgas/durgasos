'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { generateTypes } from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { CopyButton, LoadingState, ToolPanel } from './shared';

export function JsonToTypeTab() {
  const [jsonInput, setJsonInput] = useState('{\n  "id": 1,\n  "name": "Example"\n}');
  const [typeSystem, setTypeSystem] = useState<'TypeScript' | 'Zod Schema'>('TypeScript');
  const [rootName, setRootName] = useState('RootType');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      JSON.parse(jsonInput);
      setOutput(await generateTypes(jsonInput, typeSystem, rootName));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel
      title="JSON to Type"
      description="Generate TypeScript interfaces or Zod schemas from JSON."
    >
      <div className="flex flex-wrap gap-2 mb-2">
        <select
          value={typeSystem}
          onChange={(e) => setTypeSystem(e.target.value as 'TypeScript' | 'Zod Schema')}
          className="rounded bg-slate-800 border border-slate-600 text-sm px-2 py-1"
        >
          <option>TypeScript</option>
          <option>Zod Schema</option>
        </select>
        <input
          className="rounded bg-slate-800 border border-slate-600 text-sm px-2 py-1 w-32"
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
          placeholder="Root type name"
        />
        <button type="button" className={styles.btn} disabled={loading} onClick={() => void run()}>
          <Sparkles className="h-4 w-4" />
          Generate
        </button>
      </div>
      <textarea
        className={styles.textarea}
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />
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
