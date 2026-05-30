'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, LogIn, Lock, LayoutTemplate, Eye } from 'lucide-react';

import { LibraryHeader } from '@/components/apps/library/LibraryHeader';
import { BookSidebar } from '@/components/apps/library/BookSidebar';
import { ReadingEditor } from '@/components/apps/library/ReadingEditor';
import { ChatInterface } from '@/components/apps/library/ChatInterface';
import { InsightSidebar } from '@/components/apps/library/InsightSidebar';
import type { ChatMessage, LibraryBook, LibraryNote } from '@/components/apps/library/types';
import { useLibraryData } from '@/hooks/use-library-data';
import { libraryChat } from '@/lib/library-api';
import { ME } from '@/lib/graphql-modules';
import { useOS } from '@/components/os-context';

export function LibraryApp() {
  const { openApp } = useOS();
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);
  const userLabel = meQ.data?.me?.email || 'Signed in';

  const {
    books,
    notes,
    devices,
    notifications,
    loading,
    saveBook,
    removeBook,
    saveNote,
    runSync,
    clearNotification,
  } = useLibraryData(authed);

  const [activeBookIds, setActiveBookIds] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState('');
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  useEffect(() => {
    if (books.length > 0 && activeBookIds.length === 0) {
      setActiveBookIds(books.map((b) => b.id));
    }
  }, [books, activeBookIds.length]);

  useEffect(() => {
    if (notes.length > 0 && (!activeNoteId || !notes.some((n) => n.id === activeNoteId))) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q) ||
        book.isbn.includes(q)
    );
  }, [books, searchQuery]);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? notes[0];

  const toggleBookSelection = useCallback((id: string) => {
    setActiveBookIds((prev) =>
      prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]
    );
  }, []);

  const handleChatSubmit = useCallback(
    async (query: string) => {
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toISOString(),
      };
      setChatLogs((prev) => [...prev, userMsg]);
      setIsLoadingChat(true);
      try {
        const response = await libraryChat(query, activeBookIds, chatLogs);
        setChatLogs((prev) => [...prev, response]);
      } catch (err) {
        console.error('Library chat error:', err);
      } finally {
        setIsLoadingChat(false);
      }
    },
    [activeBookIds, chatLogs]
  );

  const handleAddBook = useCallback(
    async (bookData: Partial<LibraryBook> & { id: string }) => {
      await saveBook({
        ...bookData,
        borrowingStatus: bookData.borrowingStatus || 'available',
        pagesTotal: bookData.pagesTotal ?? 200,
        pagesRead: bookData.pagesRead ?? 0,
      });
    },
    [saveBook]
  );

  const handleUpdateBook = useCallback(
    async (id: string, update: Partial<LibraryBook>) => {
      const existing = books.find((b) => b.id === id);
      if (!existing) return;
      await saveBook({ ...existing, ...update, id });
    },
    [books, saveBook]
  );

  if (meQ.loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#07090E] text-slate-400 text-xs font-mono">
        Loading library…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#07090E] p-6">
        <div className="max-w-sm w-full text-center space-y-6 p-8 rounded-2xl border border-slate-800 bg-[#0F1117]">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AuraBook Library</h2>
            <p className="text-xs text-slate-400 mt-2">
              Sign in to DurgasOS to sync your personal catalog, notes, and grounded research chat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openApp('settings')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium"
          >
            <LogIn className="h-4 w-4" />
            Open Settings to sign in
          </button>
          <p className="text-[10px] text-slate-600 font-mono flex items-center justify-center gap-1">
            <Lock className="h-3 w-3 text-emerald-500" />
            JWT-secured workspace
          </p>
        </div>
      </div>
    );
  }

  if (loading && books.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#07090E]">
        <div className="h-8 w-8 border-2 border-t-emerald-500 border-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-950 text-gray-200 overflow-hidden">
      <LibraryHeader
        userLabel={userLabel}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        leftSidebarOpen={leftSidebarOpen}
        setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
        notifications={notifications}
        onClearNotification={clearNotification}
      />

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <AnimatePresence initial={false}>
          {leftSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden h-full border-r border-slate-800 shrink-0"
            >
              <BookSidebar
                books={filteredBooks}
                activeBookIds={activeBookIds}
                toggleBookSelection={toggleBookSelection}
                onAddBook={handleAddBook}
                onUpdateBook={handleUpdateBook}
                onDeleteBook={removeBook}
                devices={devices}
                onTriggerSync={runSync}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          {activeNote ? (
            <>
              <ReadingEditor
                note={activeNote}
                books={books}
                onSaveNote={(n: LibraryNote) => void saveNote(n)}
              />
              <ChatInterface
                messages={chatLogs}
                onSubmitQuery={handleChatSubmit}
                onClearChat={() => setChatLogs([])}
                activeBookIds={activeBookIds}
                books={books}
                isLoading={isLoadingChat}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="space-y-3 max-w-md">
                <LayoutTemplate className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm text-slate-400">
                  No research notebook yet. Data will appear after seed.
                </p>
              </div>
            </div>
          )}

          {!leftSidebarOpen && (
            <button
              type="button"
              onClick={() => setLeftSidebarOpen(true)}
              className="absolute top-2 left-2 z-10 px-2 py-1 text-[10px] rounded-full bg-slate-900 border border-emerald-500/20 text-emerald-400 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Books
            </button>
          )}
          {!rightSidebarOpen && (
            <button
              type="button"
              onClick={() => setRightSidebarOpen(true)}
              className="absolute top-2 right-2 z-10 px-2 py-1 text-[10px] rounded-full bg-slate-900 border border-emerald-500/20 text-emerald-400 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Insights
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {rightSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden h-full shrink-0"
            >
              <InsightSidebar books={books} activeBookIds={activeBookIds} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
