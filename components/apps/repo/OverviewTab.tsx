'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star, GitFork, BookOpen, Search, Sparkles } from 'lucide-react';

import { ContributionGraph } from '@/components/apps/repo/ContributionGraph';
import { badges, BadgeItem } from '@/components/apps/repo/Badges';
import type { GithubUserPayload } from '@/components/apps/repo/GitHubProfileCard';
import { MarkdownReader } from '@/components/apps/repo/MarkdownReader';

function repoName(r: Record<string, unknown>): string {
  return typeof r.name === 'string' ? r.name : typeof r.full_name === 'string' ? r.full_name : '—';
}

function repoStars(r: Record<string, unknown>): number {
  return typeof r.stargazers_count === 'number' ? r.stargazers_count : 0;
}

function repoForks(r: Record<string, unknown>): number {
  return typeof r.forks_count === 'number' ? r.forks_count : 0;
}

function repoLang(r: Record<string, unknown>): string {
  return typeof r.language === 'string' ? r.language : '—';
}

function repoUrl(r: Record<string, unknown>): string | null {
  return typeof r.html_url === 'string' ? r.html_url : null;
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

export function OverviewTab({
  user,
  readme,
  repos,
  readmeLoading,
}: {
  user: GithubUserPayload;
  repos: unknown;
  readme: unknown;
  readmeLoading: boolean;
}) {
  const [popularQ, setPopularQ] = useState('');

  const readmeText = useMemo(() => {
    if (!readme || typeof readme !== 'object') return null;
    const o = readme as Record<string, unknown>;
    if (o.found === false) return null;
    const t = o.text;
    return typeof t === 'string' && t.trim() ? t : null;
  }, [readme]);

  const topRepos = useMemo(() => {
    if (!Array.isArray(repos)) return [];
    return repos
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
      .filter((r) => !r.fork);
  }, [repos]);

  const filteredPopularRepos = useMemo(() => {
    const term = popularQ.trim().toLowerCase();
    const sliced = topRepos.slice(0, 6);
    if (!term) return sliced;
    return sliced.filter((r) => {
      const name = repoName(r).toLowerCase();
      const desc = (typeof r.description === 'string' ? r.description : '').toLowerCase();
      return name.includes(term) || desc.includes(term);
    });
  }, [topRepos, popularQ]);

  const login = user && typeof user.login === 'string' ? user.login : '';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* README - Bento Card full span top */}
      <div className="lg:col-span-3 flex flex-col min-h-[220px]">
        {readmeLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-white/45 gap-2 min-h-[140px] rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            Loading README…
          </div>
        ) : readmeText ? (
          <MarkdownReader readmeText={readmeText} username={login || 'GitHub User'} />
        ) : (
          <div className="flex flex-col justify-center h-full min-h-[140px] items-center text-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <BookOpen className="h-8 w-8 text-white/15" />
            <div>
              <h5 className="text-sm font-semibold text-white/60 mb-1">No profile README found</h5>
              <p className="text-xs text-white/35 leading-relaxed max-w-xs">
                Create a repository named{' '}
                <code className="rounded bg-white/5 px-1 text-violet-300">
                  {login || 'username'}
                </code>{' '}
                with a README.md to display it here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mini Achievements Card - 1 column */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between">
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            Achievements
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {badges.slice(0, 8).map((b, i) => (
              <div key={i} className="flex justify-center">
                <BadgeItem badge={b} size="sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-white/35">
          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-white/45">
            Beta
          </span>
          <span>Send feedback</span>
        </div>
      </div>

      {/* Interactive Contribution Graph - 2 columns in row 2 */}
      <div className="lg:col-span-2">
        <ContributionGraph />
      </div>

      {/* Popular Repositories - Bento Card Span 2 Columns */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2 flex flex-col">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-white/85 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-violet-400" />
            Popular Repositories
          </h4>
          <div className="relative w-full sm:max-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              placeholder="Filter popular..."
              value={popularQ}
              onChange={(e) => setPopularQ(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-1 pl-8 pr-2.5 text-xs text-white/90 outline-none placeholder:text-white/30 focus:border-violet-400/30"
            />
          </div>
        </div>

        {filteredPopularRepos.length === 0 ? (
          <p className="text-xs text-white/45 py-8 text-center border border-dashed border-white/5 rounded-xl">
            No popular repositories to display matching search.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filteredPopularRepos.map((r) => {
              const href = repoUrl(r);
              const visibility = typeof r.visibility === 'string' ? r.visibility : 'Public';
              const inner = (
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-white/35 shrink-0" />
                      <p className="truncate font-semibold text-white/90 text-sm group-hover:text-violet-400 transition-colors flex-1">
                        {repoName(r)}
                      </p>
                      <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
                        {visibility}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-white/45 leading-relaxed">
                      {typeof r.description === 'string'
                        ? r.description
                        : 'No description provided'}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[10px] text-white/50 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${getLanguageColor(repoLang(r))}`}
                      />
                      <span>{repoLang(r)}</span>
                    </div>
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3" />
                      {repoStars(r)}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <GitFork className="h-3 w-3" />
                      {repoForks(r)}
                    </span>
                  </div>
                </div>
              );
              return (
                <li key={repoName(r)} className="group">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-36 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition hover:border-violet-400/25 hover:bg-white/[0.06] hover:shadow-lg"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="h-36 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Profile Overview Stats - Bento Card Span 1 Column */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between">
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Developer Statistics
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-white/45 text-xs">Total Repositories</span>
              <span className="font-mono text-sm font-semibold text-white/90">
                {Array.isArray(repos) ? repos.length : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-white/45 text-xs">Followers</span>
              <span className="font-mono text-sm font-semibold text-white/90">
                {user && typeof user.followers === 'number' ? user.followers.toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-white/45 text-xs">Starred Repositories</span>
              <span className="font-mono text-sm font-semibold text-white/90">
                {user && typeof user.public_gists === 'number' ? user.public_gists : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/45 text-xs">Linked Status</span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.2 text-[10px] font-medium text-emerald-400">
                Active Token
              </span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-white/35 leading-normal mt-4">
          Stats aggregate live API calls with caching layers enabled to optimize system performance.
        </p>
      </div>
    </div>
  );
}
