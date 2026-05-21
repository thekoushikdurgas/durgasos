'use client';

import { useMemo, useState } from 'react';
import {
  Star,
  GitFork,
  Search,
  SlidersHorizontal,
  Globe,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

interface StarredRepository {
  name: string;
  full_name?: string;
  description?: string;
  stargazers_count?: number;
  forks_count?: number;
  language?: string;
  html_url?: string;
  owner?: { login?: string; html_url?: string };
}

function asRepoList(raw: unknown): StarredRepository[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is StarredRepository => x !== null && typeof x === 'object');
}

const getLanguageColor = (lang: string) => {
  switch (lang) {
    case 'TypeScript':
      return 'bg-blue-500';
    case 'JavaScript':
      return 'bg-yellow-400';
    case 'Python':
      return 'bg-sky-400';
    case 'HTML':
      return 'bg-orange-500';
    case 'CSS':
      return 'bg-purple-500';
    case 'Vue':
      return 'bg-emerald-500';
    case 'Rust':
      return 'bg-orange-700';
    case 'Go':
      return 'bg-cyan-500';
    default:
      return 'bg-slate-400';
  }
};

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
  const [sortBy, setSortBy] = useState<'stars' | 'forks' | 'name'>('stars');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Extract language choices dynamically
  const languages = useMemo(() => {
    const set = new Set<string>();
    list.forEach((r) => {
      if (r.language && r.language !== '—') set.add(r.language);
    });
    return Array.from(set);
  }, [list]);

  const filteredAndSorted = useMemo(() => {
    // 1. Filter
    const term = q.trim().toLowerCase();
    let result = list.filter((r) => {
      const name = (r.full_name || r.name || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const matchesSearch = name.includes(term) || desc.includes(term);

      const matchesLang =
        selectedLanguage === 'all' ||
        (r.language && r.language.toLowerCase() === selectedLanguage.toLowerCase());

      return matchesSearch && matchesLang;
    });

    // 2. Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.full_name || a.name || '';
        const nameB = b.full_name || b.name || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'forks') {
        const forksA = a.forks_count ?? 0;
        const forksB = b.forks_count ?? 0;
        return forksB - forksA;
      }
      // default: stars
      const starsA = a.stargazers_count ?? 0;
      const starsB = b.stargazers_count ?? 0;
      return starsB - starsA;
    });

    return result;
  }, [list, q, selectedLanguage, sortBy]);

  if (error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200/90 font-sans">
        {error.message}
      </p>
    );
  }

  if (loading && list.length === 0) {
    return <p className="text-sm text-white/45 font-sans">Loading starred repositories…</p>;
  }

  return (
    <div className="space-y-4 font-sans text-xs text-white/90">
      {/* Controls & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search starred repositories…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 pl-9 pr-3 text-xs text-white/90 outline-none focus:border-violet-400/30 placeholder:text-white/30"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-sans">
            <SlidersHorizontal className="h-3.5 w-3.5 text-white/40" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-white/80 border-none outline-none text-[11px] font-medium cursor-pointer"
            >
              <option value="stars" className="bg-slate-900 text-white">
                Most stars
              </option>
              <option value="forks" className="bg-slate-900 text-white">
                Most forks
              </option>
              <option value="name" className="bg-slate-900 text-white">
                Name
              </option>
            </select>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            <Globe className="h-3.5 w-3.5 text-white/40" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-white/80 border-none outline-none text-[11px] font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Languages
              </option>
              {languages.map((lang) => (
                <option key={lang} value={lang.toLowerCase()} className="bg-slate-900 text-white">
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="min-w-0 flex-1 space-y-2">
        {filteredAndSorted.length === 0 ? (
          <div className="py-12 text-center text-white/45 border border-dashed border-white/5 rounded-xl">
            No starred repositories found matching filters.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredAndSorted.map((r) => {
              const full = r.full_name || r.name || '—';
              const stars = r.stargazers_count ?? 0;
              const forks = r.forks_count ?? 0;
              const lang = r.language ?? null;
              const desc = r.description ?? '';
              const href = r.html_url ?? null;

              // Parse owner from full_name (e.g. "torvalds/linux")
              const parts = full.split('/');
              const ownerName = parts.length >= 2 ? parts[0] : null;
              const repoName = parts.length >= 2 ? parts[1] : full;
              const ownerHref = ownerName ? `https://github.com/${ownerName}` : null;

              return (
                <li key={full} className="group py-5 first:pt-0">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      {/* Owner / Repo name */}
                      <div className="flex flex-wrap items-baseline gap-0.5 mb-1.5">
                        {ownerName && ownerHref ? (
                          <a
                            href={ownerHref}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lg text-sky-300/90 font-medium hover:underline"
                          >
                            {ownerName}
                          </a>
                        ) : null}
                        {ownerName ? <span className="text-lg text-white/30 mx-0.5">/</span> : null}
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lg font-bold text-white/90 hover:text-sky-200 hover:underline transition-colors"
                          >
                            {repoName}
                          </a>
                        ) : (
                          <span className="text-lg font-bold text-white/90">{repoName}</span>
                        )}
                      </div>

                      {/* Description */}
                      {desc ? (
                        <p className="text-sm text-white/55 line-clamp-2 leading-relaxed mb-3 max-w-2xl">
                          {desc}
                        </p>
                      ) : null}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-white/45">
                        {lang && (
                          <div className="flex items-center gap-1.5">
                            <span className={`h-3 w-3 rounded-full ${getLanguageColor(lang)}`} />
                            <span>{lang}</span>
                          </div>
                        )}
                        {stars > 0 && (
                          <a
                            href={href ? `${href}/stargazers` : undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                          >
                            <Star className="h-3.5 w-3.5" />
                            {stars.toLocaleString()}
                          </a>
                        )}
                        {forks > 0 && (
                          <span className="flex items-center gap-1">
                            <GitFork className="h-3.5 w-3.5" />
                            {forks.toLocaleString()}
                          </span>
                        )}
                        <span className="text-white/30">
                          Starred on{' '}
                          {new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Side actions */}
                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition"
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Starred
                      </button>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/50 hover:bg-white/[0.07] hover:text-white/80 transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
