'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, RefreshCw, Trash2, CheckSquare, Square, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  MOCK_APP_PACKAGES,
  packagesByCategory,
  type AppPackage,
  type AppPackageCategory,
} from '@/lib/apps-catalog-mock';

const CATEGORIES: (AppPackageCategory | 'All')[] = [
  'All',
  'Graphics',
  'Video',
  'Development',
  'Tools',
  'Audio',
  'Internet',
  'Office',
  'Games',
  'Other',
];

type Job = { id: string; name: string; progress: number; status: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppsManagerApp() {
  const [cat, setCat] = useState<AppPackageCategory | 'All'>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_APP_PACKAGES[0]?.id ?? null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<Job[]>([]);

  const list = useMemo(() => {
    const base = packagesByCategory(cat);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [cat, query]);

  const detail: AppPackage | undefined = useMemo(
    () => MOCK_APP_PACKAGES.find((p) => p.id === selectedId),
    [selectedId]
  );

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const mockInstall = useCallback((p: AppPackage) => {
    const id = `job-${Date.now()}`;
    setJobs((prev) => [...prev, { id, name: p.name, progress: 0, status: 'Downloading…' }]);
    let t = 0;
    const iv = setInterval(() => {
      t += 12;
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? {
                ...j,
                progress: Math.min(100, t),
                status: t >= 100 ? 'Installing…' : 'Downloading…',
              }
            : j
        )
      );
      if (t >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== id));
        }, 600);
      }
    }, 120);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-2">
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] uppercase text-white/60 hover:bg-white/10"
        >
          File
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] uppercase text-white/60 hover:bg-white/10"
        >
          Help
        </button>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
            onClick={() => {
              const first = list.find((p) => checked.has(p.id));
              if (first) mockInstall(first);
            }}
            title="Install first checked (demo)"
          >
            <Download className="mr-1 inline h-3.5 w-3.5" />
            Install
          </button>
          <button
            type="button"
            className="rounded border border-white/10 px-2 py-1 text-xs opacity-50"
          >
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            Uninstall
          </button>
          <button type="button" className="rounded border border-white/10 p-1 hover:bg-white/10">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
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
              <Package className="h-3 w-3 shrink-0 opacity-60" />
              {c}
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
                    <th className="w-10 p-2" />
                    <th className="p-2">Name</th>
                    <th className="p-2">Version</th>
                    <th className="p-2">Description</th>
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
                      <td className="p-2">
                        <button
                          type="button"
                          aria-label="Select for install"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCheck(p.id);
                          }}
                        >
                          {checked.has(p.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Square className="h-4 w-4 text-white/30" />
                          )}
                        </button>
                      </td>
                      <td className="p-2 font-medium text-white/90">{p.name}</td>
                      <td className="p-2 text-white/60">{p.version}</td>
                      <td className="max-w-[240px] truncate p-2 text-white/50">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 border-t border-white/10 bg-black/30 p-3 text-xs">
              {detail ? (
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="font-semibold text-white">{detail.name}</p>
                    <p className="text-white/50">
                      {detail.installed ? 'Installed' : 'Not installed'} · {detail.license}
                    </p>
                    <p className="mt-1 text-white/60">{detail.description}</p>
                    <p className="mt-1 text-white/40">Size: {formatBytes(detail.sizeBytes)}</p>
                    <a
                      href={detail.downloadUrl}
                      className="text-blue-400 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {detail.downloadUrl}
                    </a>
                  </div>
                  <button
                    type="button"
                    className="self-start rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm hover:bg-emerald-600"
                    onClick={() => mockInstall(detail)}
                  >
                    Install (demo)
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="fixed bottom-24 right-6 z-[200] w-80 rounded-lg border border-white/15 bg-slate-900/95 p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-white/80">Progress</p>
          {jobs.map((j) => (
            <div key={j.id} className="mb-2">
              <div className="mb-1 flex justify-between text-[10px] text-white/60">
                <span>{j.name}</span>
                <span>{j.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-white/10">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${j.progress}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-white/40">{j.status}</p>
            </div>
          ))}
        </div>
      ) : null}

      <footer className="flex h-7 shrink-0 items-center border-t border-white/10 bg-black/30 px-3 text-[10px] text-white/50">
        {MOCK_APP_PACKAGES.length} applications · {checked.size} selected for install
      </footer>
    </div>
  );
}
