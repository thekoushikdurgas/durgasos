'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import styles from '../DevToolApp.module.css';
import { ToolPanel } from './shared';

const AceEditor = dynamic(
  async () => {
    const mod = await import('react-ace');
    await import('ace-builds/src-noconflict/mode-javascript');
    await import('ace-builds/src-noconflict/mode-html');
    await import('ace-builds/src-noconflict/mode-css');
    await import('ace-builds/src-noconflict/theme-monokai');
    return mod.default;
  },
  { ssr: false, loading: () => <p className="text-slate-400 text-sm">Loading editor…</p> }
);

const LANG_MODES: Record<string, string> = {
  javascript: 'javascript',
  html: 'html',
  css: 'css',
};

export function CodeEditorTab() {
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState('// Dev AI code editor\nconsole.log("hello");');

  return (
    <ToolPanel title="Code Editor" description="Multi-language Ace editor (local, no AI).">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded bg-slate-800 border border-slate-600 text-sm px-2 py-1 mb-2"
      >
        {Object.keys(LANG_MODES).map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <div className="rounded border border-slate-700 overflow-hidden" style={{ minHeight: 320 }}>
        <AceEditor
          mode={LANG_MODES[lang]}
          theme="monokai"
          value={code}
          onChange={setCode}
          name="dev-tool-ace"
          width="100%"
          height="320px"
          fontSize={13}
          setOptions={{ useWorker: false }}
        />
      </div>
      <button
        type="button"
        className={`${styles.btn} mt-2`}
        onClick={() => void navigator.clipboard.writeText(code)}
      >
        Copy code
      </button>
    </ToolPanel>
  );
}
