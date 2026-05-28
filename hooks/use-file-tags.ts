'use client';

import { useCallback, useEffect, useState } from 'react';

import { swallowStorageError } from '@/lib/safe-client-storage';

const STORAGE_KEY = 'durgasos.file-tags.v1';

/** Persist tag data: { [filePath]: string[] } */
type TagStore = Record<string, string[]>;

function loadStore(): TagStore {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as TagStore;
  } catch {
    return {};
  }
}

function saveStore(store: TagStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    swallowStorageError('file-tags.save', err);
  }
}

/** Returns tags and mutation helpers for all files. */
export function useFileTags() {
  const [store, setStore] = useState<TagStore>(loadStore);

  // Sync across tabs
  useEffect(() => {
    const handler = () => setStore(loadStore());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const getFileTags = useCallback((filePath: string): string[] => store[filePath] ?? [], [store]);

  const addTag = useCallback((filePath: string, tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed) return;
    setStore((prev) => {
      const existing = prev[filePath] ?? [];
      if (existing.includes(trimmed)) return prev;
      const next = { ...prev, [filePath]: [...existing, trimmed] };
      saveStore(next);
      return next;
    });
  }, []);

  const removeTag = useCallback((filePath: string, tag: string) => {
    setStore((prev) => {
      const existing = prev[filePath] ?? [];
      const next = { ...prev, [filePath]: existing.filter((t) => t !== tag) };
      saveStore(next);
      return next;
    });
  }, []);

  const clearTags = useCallback((filePath: string) => {
    setStore((prev) => {
      const next = { ...prev };
      delete next[filePath];
      saveStore(next);
      return next;
    });
  }, []);

  return { getFileTags, addTag, removeTag, clearTags, store };
}
