'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import {
  createMemory,
  deleteMemory,
  listMemories,
  uploadDevToolFile,
  type MemoryItem,
} from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { LoadingState, ToolPanel } from './shared';

export function MemoryBankTab() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'text' | 'url' | 'file'>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMemories(await listMemories());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      let savedContent = content;
      if (type === 'file' && file) {
        const up = await uploadDevToolFile(file, 'memories');
        savedContent = up.signed_url || up.path;
      }
      await createMemory(type, savedContent);
      setContent('');
      setFile(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToolPanel title="Memory Bank" description="Save text, URLs, or files to your cloud memory.">
      <div className="flex gap-2 mb-2 text-sm">
        {(['text', 'url', 'file'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.btn} ${type === t ? '' : styles.btnSecondary}`}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {type === 'file' ? (
        <input
          type="file"
          className="text-sm mb-2"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      ) : (
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      )}
      <button type="button" className={styles.btn} disabled={saving} onClick={() => void save()}>
        Save memory
      </button>
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <LoadingState />
      ) : (
        <ul className="mt-6 space-y-2">
          {memories.map((m) => (
            <li
              key={m.id}
              className="p-3 rounded border border-slate-700 bg-slate-800/40 flex justify-between gap-2"
            >
              <div>
                <p className="font-medium text-slate-200">{m.title}</p>
                <p className="text-xs text-slate-500">{m.type}</p>
                <p className="text-sm text-slate-400 mt-1 truncate max-w-md">{m.content}</p>
              </div>
              <button
                type="button"
                className="text-red-400 shrink-0"
                onClick={() => void deleteMemory(m.id).then(load)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ToolPanel>
  );
}
