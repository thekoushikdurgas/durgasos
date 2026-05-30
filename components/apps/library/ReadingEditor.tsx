'use client';

import React, { useEffect, useState } from 'react';
import { Save, BookMarked } from 'lucide-react';

import type { LibraryBook, LibraryNote } from '@/components/apps/library/types';

type Props = {
  note: LibraryNote;
  books: LibraryBook[];
  onSaveNote: (note: LibraryNote) => void;
};

export function ReadingEditor({ note, books, onSaveNote }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setDirty(false);
  }, [note.id, note.title, note.content]);

  const linked = books.filter((b) => note.linkedBookIds.includes(b.id));

  return (
    <div className="flex flex-col min-h-0 flex-1 border-b border-slate-800">
      <div className="px-4 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-[#0A0C10]">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="flex-1 bg-transparent text-sm font-semibold text-slate-100 focus:outline-none"
          placeholder="Notebook title"
        />
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            onSaveNote({ ...note, title, content });
            setDirty(false);
          }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase rounded border border-emerald-500/30 text-emerald-400 disabled:opacity-40"
        >
          <Save className="h-3 w-3" />
          Save
        </button>
      </div>
      {linked.length > 0 && (
        <div className="px-4 py-1.5 flex flex-wrap gap-1 bg-emerald-950/20 border-b border-slate-800/50">
          {linked.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
            >
              <BookMarked className="h-2.5 w-2.5" />
              {b.title}
            </span>
          ))}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        className="flex-1 min-h-[180px] resize-none bg-[#07090E] text-slate-300 text-sm p-4 font-mono leading-relaxed focus:outline-none"
        placeholder="Markdown research notes…"
      />
    </div>
  );
}
