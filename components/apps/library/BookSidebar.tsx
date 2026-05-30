'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, RefreshCcw, Check, Upload, Loader2 } from 'lucide-react';

import type { LibraryBook, UserDevice } from '@/components/apps/library/types';
import { lookupBookByIsbn } from '@/lib/library-api';
import { newBookId } from '@/lib/library-format';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import { RemoteImage } from '@/components/ui/remote-image';
import { uploadFileInChunks } from '@/lib/chunked-upload';

type Props = {
  books: LibraryBook[];
  activeBookIds: string[];
  toggleBookSelection: (id: string) => void;
  onAddBook: (book: Partial<LibraryBook> & { id: string }, pdfFile?: File | null) => Promise<void>;
  onUpdateBook: (id: string, update: Partial<LibraryBook>) => Promise<void>;
  onDeleteBook: (id: string) => Promise<void>;
  devices: UserDevice[];
  onTriggerSync: () => Promise<void>;
};

export function BookSidebar({
  books,
  activeBookIds,
  toggleBookSelection,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  devices,
  onTriggerSync,
}: Props) {
  const [tab, setTab] = useState<'books' | 'borrow' | 'sync'>('books');
  const [showAdd, setShowAdd] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('General');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleLookup = async () => {
    if (!isbn.trim() && !title.trim()) return;
    setFetching(true);
    try {
      const info = await lookupBookByIsbn(
        isbn.trim(),
        title.trim() || undefined,
        author.trim() || undefined
      );
      if (info.title) setTitle(info.title);
      if (info.author) setAuthor(info.author);
      if (info.category) setCategory(info.category);
      if (info.isbn) setIsbn(info.isbn);
    } catch {
      /* manual entry still allowed */
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = newBookId();
      let pdfStoragePath: string | undefined;
      let pdfContent: string | undefined;
      if (pdfFile) {
        const tok = readStoredAuthTokens()?.access?.trim();
        const authHeader = tok ? `Bearer ${tok}` : null;
        const rel = `library/pdfs/${id}/${pdfFile.name}`;
        const result = await uploadFileInChunks(pdfFile, rel, authHeader, () => {});
        pdfStoragePath = result.path;
        pdfContent = `Uploaded document: ${pdfFile.name}`;
      }
      await onAddBook(
        {
          id,
          title: title.trim(),
          author: author.trim() || 'Unknown Author',
          isbn: isbn.trim(),
          category,
          pdfAttached: !!pdfFile,
          pdfName: pdfFile?.name,
          pdfStoragePath,
          pdfContent,
        },
        pdfFile
      );
      setShowAdd(false);
      setTitle('');
      setAuthor('');
      setIsbn('');
      setPdfFile(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0C10] w-80">
      <div className="flex border-b border-slate-800 text-[10px] font-mono uppercase">
        {(['books', 'borrow', 'sync'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'books' && (
        <>
          <div className="p-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Plus className="h-3.5 w-3.5" />
              Add book
            </button>
            {showAdd && (
              <div className="mt-2 space-y-2 text-xs">
                <input
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="ISBN"
                  className="w-full bg-[#07090E] border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={fetching}
                  className="w-full py-1 border border-slate-700 rounded text-slate-400 hover:text-white"
                >
                  {fetching ? (
                    <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                  ) : (
                    'Lookup metadata'
                  )}
                </button>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-[#07090E] border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author"
                  className="w-full bg-[#07090E] border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                  <Upload className="h-3 w-3" />
                  <span className="truncate">{pdfFile?.name || 'Attach PDF'}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !title.trim()}
                  className="w-full py-1.5 rounded bg-emerald-600 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Catalog book'}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {books.map((book) => {
              const selected = activeBookIds.includes(book.id);
              return (
                <div
                  key={book.id}
                  className={`rounded-lg border p-2 cursor-pointer transition-colors ${
                    selected
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                  onClick={() => toggleBookSelection(book.id)}
                >
                  <div className="flex gap-2">
                    {book.coverUrl ? (
                      <RemoteImage
                        src={book.coverUrl}
                        alt=""
                        width={40}
                        height={56}
                        className="w-10 h-14 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-slate-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate">{book.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{book.author}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {book.borrowingStatus === 'borrowed' ? 'Borrowed' : 'Available'} ·{' '}
                        {book.pagesRead}/{book.pagesTotal} pp
                      </p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onDeleteBook(book.id)}
                      className="text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'borrow' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
          {books.map((book) => (
            <div key={book.id} className="border border-slate-800 rounded-lg p-2">
              <p className="font-medium text-slate-200 truncate">{book.title}</p>
              <select
                value={book.borrowingStatus}
                onChange={(e) =>
                  onUpdateBook(book.id, {
                    borrowingStatus: e.target.value as 'available' | 'borrowed',
                    borrower: e.target.value === 'borrowed' ? book.borrower || 'Guest' : undefined,
                    returnDueDate:
                      e.target.value === 'borrowed'
                        ? book.returnDueDate ||
                          new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                        : undefined,
                  })
                }
                className="mt-1 w-full bg-[#07090E] border border-slate-700 rounded px-2 py-1 text-slate-300"
              >
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
              </select>
              {book.borrowingStatus === 'borrowed' && (
                <p className="text-[10px] text-amber-400/90 mt-1">
                  {book.borrower} · due {book.returnDueDate || '—'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'sync' && (
        <div className="flex-1 p-3 text-xs text-slate-400 space-y-3">
          <button
            type="button"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                await onTriggerSync();
              } finally {
                setSyncing(false);
              }
            }}
            className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync devices
          </button>
          {devices.map((d) => (
            <div key={d.id} className="border border-slate-800 rounded p-2">
              <p className="text-slate-200">{d.name}</p>
              <p className="text-[10px] text-slate-600">
                {d.type} · last {d.lastSync ? new Date(d.lastSync).toLocaleString() : 'never'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
