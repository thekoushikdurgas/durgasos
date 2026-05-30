'use client';

import { useEffect, useState } from 'react';
import { encode } from '@toon-format/toon';

import styles from '../DevToolApp.module.css';
import { CopyButton, ToolPanel } from './shared';

export function JsonToToonTab() {
  const [jsonInput, setJsonInput] = useState('');
  const [toonOutput, setToonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<',' | '\t' | '|'>(',');
  const [indent, setIndent] = useState(2);

  useEffect(() => {
    if (!jsonInput.trim()) {
      setToonOutput('');
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      setToonOutput(
        encode(parsed, {
          indent,
          delimiter,
          keyFolding: 'off',
          flattenDepth: Infinity,
        })
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [jsonInput, delimiter, indent]);

  return (
    <ToolPanel title="JSON to TOON" description="Convert JSON to TOON format locally (no AI).">
      <div className="flex gap-2 mb-2 text-sm">
        <label>
          Delimiter{' '}
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as ',' | '\t' | '|')}
            className="rounded bg-slate-800 border border-slate-600 ml-1"
          >
            <option value=",">,</option>
            <option value="\t">tab</option>
            <option value="|">|</option>
          </select>
        </label>
        <label>
          Indent{' '}
          <input
            type="number"
            min={0}
            max={8}
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="w-14 rounded bg-slate-800 border border-slate-600 ml-1"
          />
        </label>
      </div>
      <div className={styles.grid2}>
        <textarea
          className={styles.textarea}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste JSON…"
        />
        <div>
          {error && <p className={styles.error}>{error}</p>}
          {toonOutput && <CopyButton text={toonOutput} />}
          <pre className={styles.output}>{toonOutput}</pre>
        </div>
      </div>
    </ToolPanel>
  );
}
