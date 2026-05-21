'use client';

import { useMemo, useState } from 'react';
import { Star, GitFork, ChevronRight, X } from 'lucide-react';

function asRepoList(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object');
}

export function RepositoriesTab({
  repos,
  loading,
  error,
}: {
  repos: unknown;
  loading: boolean;
  error?: Error | null;
}) {
  const list = useMemo(() => asRepoList(repos), [repos]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => {
      const name = typeof r.name === 'string' ? r.name : '';
      const desc = typeof r.description === 'string' ? r.description : '';
      return name.toLowerCase().includes(s) || desc.toLowerCase().includes(s);
    });
  }, [list, q]);

  if (error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200/90">
        {error.message}
      </p>
    );
  }

  if (loading && list.length === 0) {
    return <p className="text-sm text-white/45">Loading repositories…</p>;
  }

  return (
    <div className="relative flex min-h-[280px] gap-4">
      <div className="min-w-0 flex-1 space-y-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter repositories…"
          className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/90 outline-none ring-violet-500/20 focus:ring-2"
        />
        <ul className="space-y-1">
          {filtered.map((r) => {
            const name = typeof r.name === 'string' ? r.name : '—';
            const stars = typeof r.stargazers_count === 'number' ? r.stargazers_count : 0;
            const forks = typeof r.forks_count === 'number' ? r.forks_count : 0;
            const lang = typeof r.language === 'string' ? r.language : '—';
            const desc = typeof r.description === 'string' ? r.description : '';
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setOpen(r)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-violet-400/25 hover:bg-white/[0.06]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">{name}</p>
                    {desc ? <p className="truncate text-[11px] text-white/45">{desc}</p> : null}
                  </div>
                  <span className="hidden shrink-0 text-[10px] text-white/40 sm:inline">
                    {lang}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-white/50">
                    <Star className="h-3 w-3" />
                    {stars}
                    <GitFork className="h-3 w-3" />
                    {forks}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {open ? (
        <aside className="absolute inset-y-0 right-0 z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md sm:static sm:max-w-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-white/90">
              {typeof open.name === 'string' ? open.name : 'Repository'}
            </h4>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-lg border border-white/10 p-1 text-white/60 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 text-[11px] text-white/45">
            Quick layout preview (static). Wire real tree from GitHub Contents API if needed.
          </p>
          <ul className="space-y-1 font-mono text-[11px] text-emerald-200/80">
            <li>src/</li>
            <li className="pl-3">index.ts</li>
            <li className="pl-3">app.tsx</li>
            <li>README.md</li>
            <li>package.json</li>
          </ul>
          {typeof open.html_url === 'string' ? (
            <a
              href={open.html_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs text-sky-300 hover:underline"
            >
              Open on GitHub
            </a>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
