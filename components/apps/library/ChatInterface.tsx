'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Cpu, Send, Trash2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ChatMessage, LibraryBook } from '@/components/apps/library/types';

const CHIPS = [
  {
    label: 'LSM vs B-Trees',
    query: 'Analyze LSM Trees vs B-Trees from Designing Data-Intensive Applications',
  },
  {
    label: 'Borrowed books',
    query: 'Which books are borrowed and when are they due back?',
  },
];

type Props = {
  messages: ChatMessage[];
  onSubmitQuery: (query: string) => void;
  onClearChat: () => void;
  activeBookIds: string[];
  books: LibraryBook[];
  isLoading: boolean;
};

export function ChatInterface({
  messages,
  onSubmitQuery,
  onClearChat,
  activeBookIds,
  isLoading,
}: Props) {
  const [userInput, setUserInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    onSubmitQuery(userInput.trim());
    setUserInput('');
  };

  return (
    <div className="h-80 md:h-96 flex flex-col min-h-0 bg-[#0F1117] border-t border-slate-800">
      <div className="px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1 text-emerald-400/90">
          <Zap className="h-3 w-3" />
          GROUNDING (
          {activeBookIds.length === 0 ? 'full library' : `${activeBookIds.length} selected`})
        </span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0A0C10]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-6">
            <Cpu className="h-8 w-8 text-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-400 max-w-sm">
              Ask Gemma about your catalog. Select books in the sidebar to narrow context.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => onSubmitQuery(c.query)}
                  className="text-[10px] px-2 py-1 rounded-full border border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.sender === 'user'
                    ? 'bg-emerald-600/20 border border-emerald-500/20 text-slate-100'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 prose prose-invert prose-sm max-w-none'
                }`}
              >
                {m.sender === 'gemma' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                ) : (
                  m.text
                )}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                    {m.citations.map((c) => (
                      <p key={c.id} className="text-[10px] text-emerald-400/80">
                        ↳ {c.bookTitle}
                        {c.page ? ` (p.~${c.page})` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <p className="text-xs text-slate-500 animate-pulse font-mono">Gemma synthesizing…</p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Research query…"
          disabled={isLoading}
          className="flex-1 bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          className="p-2 rounded-lg bg-emerald-600 text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
