'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useOS } from '@/components/os-context';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { motion, AnimatePresence } from 'motion/react';
import { Search } from 'lucide-react';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  APP_CATEGORY_LABELS,
  APPS,
  type AppCategory,
  type AppDefinition,
  type AppId,
} from '@/lib/apps';
import { cn } from '@/lib/utils';

const PINNED_KEY = 'durgasos_launcher_pins_v1';

function loadPins(): AppId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is AppId => typeof x === 'string' && x in APPS);
  } catch {
    return [];
  }
}

function savePins(ids: AppId[]) {
  try {
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

const CATEGORIES: AppCategory[] = ['core', 'workflows', 'data', 'system'];

export function Launcher() {
  const { isLauncherOpen, toggleLauncher, openApp } = useOS();
  const { isInstalled } = useInstalledApps();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<AppCategory>('core');
  const [pins, setPins] = useState<AppId[]>([]);

  useEffect(() => {
    if (!isLauncherOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPins(loadPins());
    });
    return () => {
      cancelled = true;
    };
  }, [isLauncherOpen]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return Object.values(APPS).filter(
      (a) =>
        isInstalled(a.id) &&
        (a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          APP_CATEGORY_LABELS[a.category].toLowerCase().includes(q))
    );
  }, [query, isInstalled]);

  const pinApp = (id: AppId) => {
    const next = pins.includes(id) ? pins : [...pins, id];
    setPins(next);
    savePins(next);
  };

  const renderAppGrid = (apps: AppDefinition[]) => (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {apps.map((app) => (
        <ContextMenu key={app.id}>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={() => openApp(app.id)}
              className="group flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-white/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-gradient-to-b from-slate-700/80 to-slate-800/80 shadow-sm transition-transform duration-[var(--duration-dock-bounce,300ms)] ease-[var(--ease-liquid)] group-hover:scale-105">
                <app.icon className={cn('h-7 w-7', app.color)} strokeWidth={1.5} />
              </div>
              <span className="max-w-full truncate text-center text-xs font-medium text-white/80 group-hover:text-white">
                {highlight(app.name, query)}
              </span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="border-white/10 bg-slate-900/95 text-slate-100">
            <ContextMenuItem onClick={() => pinApp(app.id)} className="focus:bg-white/10">
              Pin to dock (saved locally)
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                openApp(app.id);
                toggleLauncher();
              }}
              className="focus:bg-white/10"
            >
              Open app
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {isLauncherOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
          className="fixed bottom-24 left-1/2 z-50 flex h-[500px] w-[min(100vw-1rem,600px)] max-w-[600px] -translate-x-1/2 flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <LiquidGlassSurface
            variant="liquid"
            className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
          >
            <div className="p-6 pb-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search apps, files, and web…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-12 pr-4 text-sm font-medium text-white placeholder:text-white/40 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary,#3b82f6)]/50"
                  autoFocus
                />
              </div>
            </div>

            {searchResults ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <h3 className="mb-2 px-1 text-xs font-semibold text-white/50">Search results</h3>
                {renderAppGrid(searchResults)}
              </div>
            ) : (
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as AppCategory)}
                variant="pill"
                className="min-h-0 flex-1 px-4"
              >
                <TabsList className="mb-2 w-full shrink-0 justify-between gap-1 overflow-x-auto">
                  {CATEGORIES.map((c) => (
                    <TabsTrigger key={c} value={c} className="shrink-0 text-[11px] sm:text-xs">
                      {APP_CATEGORY_LABELS[c]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {CATEGORIES.map((c) => (
                  <TabsContent
                    key={c}
                    value={c}
                    className="min-h-0 flex-1 overflow-y-auto p-2 pt-0"
                  >
                    {renderAppGrid(
                      Object.values(APPS).filter((a) => a.category === c && isInstalled(a.id))
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {!searchResults && pins.some((id) => isInstalled(id)) && (
              <div className="border-t border-white/10 px-4 py-3">
                <h3 className="mb-2 text-xs font-semibold text-white/50">Pinned (local)</h3>
                <div className="flex flex-wrap gap-2">
                  {pins
                    .filter((id) => isInstalled(id))
                    .map((id) => {
                      const app = APPS[id];
                      if (!app) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => openApp(id)}
                          className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 text-xs text-white/90 hover:bg-cyan-500/20"
                        >
                          <app.icon className={cn('h-4 w-4', app.color)} strokeWidth={2} />
                          {app.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </LiquidGlassSurface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function highlight(text: string, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return text;
  const lower = text.toLowerCase();
  const i = lower.indexOf(s);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-[var(--color-accent-primary,#3b82f6)]/35 px-0.5 text-inherit">
        {text.slice(i, i + s.length)}
      </mark>
      {text.slice(i + s.length)}
    </>
  );
}
