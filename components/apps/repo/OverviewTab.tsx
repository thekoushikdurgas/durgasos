'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star } from 'lucide-react';

import { ContributionGraph } from '@/components/apps/repo/ContributionGraph';
import type { GithubUserPayload } from '@/components/apps/repo/GitHubProfileCard';

function repoName(r: Record<string, unknown>): string {
  return typeof r.name === 'string' ? r.name : typeof r.full_name === 'string' ? r.full_name : '—';
}

function repoStars(r: Record<string, unknown>): number {
  return typeof r.stargazers_count === 'number' ? r.stargazers_count : 0;
}

function repoLang(r: Record<string, unknown>): string {
  return typeof r.language === 'string' ? r.language : '—';
}

function repoUrl(r: Record<string, unknown>): string | null {
  return typeof r.html_url === 'string' ? r.html_url : null;
}

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
      .filter((r) => !r.fork)
      .slice(0, 6);
  }, [repos]);

  const login = user && typeof user.login === 'string' ? user.login : '';

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="mb-2 text-sm font-medium text-white/85">
            README {login ? `(${login}/${login})` : ''}
          </h4>
          {readmeLoading ? (
            <p className="text-xs text-white/40">Loading README…</p>
          ) : readmeText ? (
            <div className="prose prose-invert prose-sm max-h-[min(320px,40vh)] max-w-none overflow-auto pr-1 prose-p:text-white/75 prose-a:text-sky-300 prose-headings:text-white/90">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeText}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-white/45">No profile README found.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="mb-3 text-sm font-medium text-white/85">Popular repositories</h4>
          {topRepos.length === 0 ? (
            <p className="text-xs text-white/45">No repositories to show.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {topRepos.map((r) => {
                const href = repoUrl(r);
                const inner = (
                  <>
                    <p className="truncate font-medium text-white/90">{repoName(r)}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-white/45">
                      {typeof r.description === 'string' ? r.description : 'No description'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-white/50">
                      <span>{repoLang(r)}</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3" />
                        {repoStars(r)}
                      </span>
                    </div>
                  </>
                );
                return (
                  <li key={repoName(r)}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-violet-400/30 hover:bg-white/[0.07]"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <ContributionGraph />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="mb-2 text-sm font-medium text-white/85">Achievements</h4>
          <p className="text-[11px] text-white/45">
            Badges and achievements are shown in the reference design; hook them up when you add
            GitHub GraphQL.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-lg">
            {['🚀', '⭐', '🧠', '🎯', '🔥', '💎', '🌟', '🏆'].map((e) => (
              <div
                key={e}
                className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"
              >
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
