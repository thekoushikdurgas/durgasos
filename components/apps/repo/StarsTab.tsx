'use client';

import { useMemo, useState } from 'react';
import { Star, GitFork } from 'lucide-react';

function asRepoList(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object');
}

export function StarsTab({
  starred,
  loading,
  error,
}: {
  starred: unknown;
  loading: boolean;
  error?: Error | null;
}) {
  const list = useMemo(() => asRepoList(starred), [starred]);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => {
      const fn =
        typeof r.full_name === 'string' ? r.full_name : typeof r.name === 'string' ? r.name : '';
      return fn.toLowerCase().includes(s);
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
    return <p className="text-sm text-white/45">Loading starred repositories…</p>;
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter stars…"
        className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/90 outline-none ring-violet-500/20 focus:ring-2"
      />
      <ul className="space-y-1">
        {filtered.map((r) => {
          const full =
            typeof r.full_name === 'string'
              ? r.full_name
              : typeof r.name === 'string'
                ? r.name
                : '—';
          const stars = typeof r.stargazers_count === 'number' ? r.stargazers_count : 0;
          const forks = typeof r.forks_count === 'number' ? r.forks_count : 0;
          const lang = typeof r.language === 'string' ? r.language : '—';
          const href = typeof r.html_url === 'string' ? r.html_url : null;
          return (
            <li key={full}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-amber-400/25 hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-sky-200/90">
                    {full}
                  </span>
                  <span className="text-[10px] text-white/40">{lang}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                    <Star className="h-3 w-3" />
                    {stars}
                    <GitFork className="h-3 w-3" />
                    {forks}
                  </span>
                </a>
              ) : (
                <div className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/70">
                  {full}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
