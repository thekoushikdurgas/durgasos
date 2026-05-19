'use client';

import { useMemo, useState } from 'react';
import { AppWindow, ExternalLink, Package } from 'lucide-react';

import { useOS } from '@/components/os-context';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  APP_CATEGORY_LABELS,
  APP_DESCRIPTIONS,
  APPS,
  type AppCategory,
  type AppId,
} from '@/lib/apps';

const CATEGORIES: (AppCategory | 'All')[] = ['All', 'core', 'workflows', 'data', 'system'];

export function AppsManagerApp() {
  const { openApp } = useOS();
  const { installedIds, isInstalled, isMandatory, installApp, uninstallApp } = useInstalledApps();

  const [cat, setCat] = useState<AppCategory | 'All'>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<AppId | null>(() => {
    const ids = Object.keys(APPS) as AppId[];
    return ids[0] ?? null;
  });

  const list = useMemo(() => {
    const base = Object.values(APPS).filter((a) => cat === 'All' || a.category === cat);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        APP_CATEGORY_LABELS[p.category].toLowerCase().includes(q) ||
        (APP_DESCRIPTIONS[p.id]?.toLowerCase().includes(q) ?? false)
    );
  }, [cat, query]);

  const detail = selectedId ? APPS[selectedId] : undefined;
  const installed = detail ? isInstalled(detail.id) : false;
  const mandatory = detail ? isMandatory(detail.id) : false;

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-2">
        <AppWindow className="h-4 w-4 text-sky-400" aria-hidden />
        <span className="text-xs font-semibold text-white/80">My Apps</span>
        <span className="text-[10px] text-white/40">
          {installedIds.size} installed · {Object.keys(APPS).length} available
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-44 shrink-0 overflow-y-auto border-r border-white/10 p-2 text-xs">
          <p className="mb-1 text-[10px] font-bold uppercase text-white/40">Categories</p>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                'mb-0.5 flex w-full items-center gap-1 rounded px-2 py-1 text-left',
                cat === c ? 'bg-blue-500/25 text-blue-200' : 'text-white/60 hover:bg-white/5'
              )}
            >
              <Package className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              {c === 'All' ? 'All' : APP_CATEGORY_LABELS[c]}
            </button>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/5 p-2">
            <Input
              placeholder="Search applications…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs border-white/10 bg-black/30 text-sm text-white"
            />
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-0">
            <div className="min-h-0 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 border-b border-white/10 bg-slate-900/95 text-white/50">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        'cursor-pointer border-b border-white/5 hover:bg-white/5',
                        selectedId === p.id ? 'bg-blue-500/15' : ''
                      )}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td className="p-2 font-medium text-white/90">{p.name}</td>
                      <td className="p-2 text-white/60">{APP_CATEGORY_LABELS[p.category]}</td>
                      <td className="p-2 text-white/70">
                        {isInstalled(p.id) ? (
                          <span className="text-emerald-400/90">Installed</span>
                        ) : (
                          <span className="text-white/45">Not installed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 border-t border-white/10 bg-black/30 p-3 text-xs">
              {detail ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{detail.name}</p>
                    <p className="text-white/50">
                      {installed
                        ? 'Installed on this desktop'
                        : 'Not installed — hidden from launcher'}{' '}
                      · ID <code className="text-white/60">{detail.id}</code>
                    </p>
                    <p className="mt-1 text-white/65">{APP_DESCRIPTIONS[detail.id]}</p>
                    {mandatory ? (
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-amber-400/90">
                        Core app — cannot be removed
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {installed ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg bg-blue-600/85 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
                          onClick={() => openApp(detail.id, { bypassInstallCheck: true })}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={mandatory}
                          title={
                            mandatory ? 'This app is required for the desktop shell' : undefined
                          }
                          className={cn(
                            'rounded-lg border border-white/15 px-3 py-1.5 text-sm',
                            mandatory
                              ? 'cursor-not-allowed opacity-40'
                              : 'text-white/85 hover:bg-white/10'
                          )}
                          onClick={() => uninstallApp(detail.id)}
                        >
                          Uninstall
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm text-white hover:bg-emerald-600"
                        onClick={() => installApp(detail.id)}
                      >
                        Install
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex h-7 shrink-0 items-center border-t border-white/10 bg-black/30 px-3 text-[10px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3 opacity-50" aria-hidden />
          Catalog synced with this build. Signed-in users sync install state to the gateway.
        </span>
      </footer>
    </div>
  );
}
