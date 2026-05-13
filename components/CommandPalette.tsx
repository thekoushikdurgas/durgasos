'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';

import { useOS } from '@/components/os-context';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { useGlobalCommandPaletteShortcut } from '@/hooks/use-command-palette';
import { APPS, type AppId } from '@/lib/apps';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'durgasos_command_palette_recent_v1';

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as string[]).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function pushRecent(cmd: string) {
  const t = cmd.trim();
  if (!t) return;
  const prev = loadRecent().filter((x) => x !== t);
  const next = [t, ...prev].slice(0, 8);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function CommandPalette() {
  const { isCommandPaletteOpen, toggleCommandPalette, openApp } = useOS();
  const { sendCompletion } = useAiChatGateway();
  const [query, setQuery] = useState('');
  const [askMode, setAskMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useGlobalCommandPaletteShortcut(true, toggleCommandPalette);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setRecent(loadRecent());
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  const effectiveAsk = askMode || query.trimStart().startsWith('/');
  const filterText = effectiveAsk ? query.replace(/^\//, '').trim() : query.trim().toLowerCase();

  const appMatches = useMemo(() => {
    if (effectiveAsk) return [];
    return Object.values(APPS).filter((a) => {
      if (!filterText) return true;
      return a.name.toLowerCase().includes(filterText) || a.id.includes(filterText);
    });
  }, [effectiveAsk, filterText]);

  const runAsk = useCallback(async () => {
    const text = query.replace(/^\//, '').trim();
    if (!text) return;
    setStreaming(true);
    pushRecent(`/${text}`);
    setRecent(loadRecent());
    try {
      await new Promise<void>((resolve, reject) => {
        sendCompletion(
          { message: text, think: false, deepSearch: false },
          {
            onDone: () => resolve(),
            onError: (m) => reject(new Error(m)),
            onAborted: () => reject(new Error('Aborted')),
          }
        );
      });
      toggleCommandPalette();
      setQuery('');
    } catch {
      /* keep palette open */
    } finally {
      setStreaming(false);
    }
  }, [query, sendCompletion, toggleCommandPalette]);

  const launchApp = (id: AppId) => {
    openApp(id);
    pushRecent(id);
    setRecent(loadRecent());
    toggleCommandPalette();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[160] flex items-start justify-center bg-black/40 px-3 pt-[12vh] backdrop-blur-sm"
          onClick={() => toggleCommandPalette()}
        >
          <motion.div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.98 }}
          >
            <LiquidGlassSurface
              variant="liquid"
              className="overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium',
                    !effectiveAsk ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                  )}
                  onClick={() => {
                    setAskMode(false);
                    setQuery('');
                  }}
                >
                  Launch
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                    effectiveAsk ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                  )}
                  onClick={() => {
                    setAskMode(true);
                    if (!query.startsWith('/')) setQuery(`/${query}`);
                  }}
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Ask
                </button>
              </div>
              <div className="relative border-b border-white/10 p-3">
                <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuery(v);
                    if (v.trimStart().startsWith('/')) setAskMode(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (effectiveAsk) void runAsk();
                      else if (appMatches[0]) launchApp(appMatches[0].id);
                    }
                    if (e.key === 'Escape') toggleCommandPalette();
                  }}
                  placeholder={effectiveAsk ? 'Ask the AI… (leading / optional)' : 'Search apps…'}
                  className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary,#3b82f6)]/50"
                />
              </div>
              <div className="max-h-[min(50vh,22rem)] overflow-y-auto p-2 text-sm">
                {recent.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                      Recent
                    </div>
                    {recent.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="flex w-full rounded-lg px-2 py-1.5 text-left text-white/85 hover:bg-white/10"
                        onClick={() => {
                          setQuery(r.startsWith('/') ? r : r);
                          if (r.startsWith('/')) setAskMode(true);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
                {!effectiveAsk && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                      Apps
                    </div>
                    {appMatches.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/10"
                        onClick={() => launchApp(a.id)}
                      >
                        <a.icon className={cn('h-5 w-5 shrink-0', a.color)} strokeWidth={1.5} />
                        <span className="font-medium text-white">{a.name}</span>
                      </button>
                    ))}
                  </>
                )}
                {effectiveAsk && (
                  <p className="px-2 py-3 text-xs text-white/55">
                    Press Enter to send to the desktop AI. Uses the same streaming gateway as the
                    top AI bar.
                  </p>
                )}
                {streaming && (
                  <p className="px-2 py-2 text-xs text-cyan-300/90">Streaming response…</p>
                )}
              </div>
            </LiquidGlassSurface>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
