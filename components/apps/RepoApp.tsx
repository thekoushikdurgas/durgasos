'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  LayoutGrid,
  Star,
  Briefcase,
  Package,
  Search,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

// GitHub Octocat SVG (lucide-react v1.16.0 doesn't include Github)
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
import Image from 'next/image';

import { ModuleAppShell } from '@/components/apps/ModuleAppShell';
import { ContributionGraph } from '@/components/apps/repo/ContributionGraph';
import { GitHubAccountPicker } from '@/components/apps/repo/GitHubAccountPicker';
import {
  GitHubProfileCard,
  type GithubUserPayload,
} from '@/components/apps/repo/GitHubProfileCard';
import { OverviewTab } from '@/components/apps/repo/OverviewTab';
import { PublicSearchBar } from '@/components/apps/repo/PublicSearchBar';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { RepositoriesTab, type Repository } from '@/components/apps/repo/RepositoriesTab';
import { StarsTab } from '@/components/apps/repo/StarsTab';
import { ProjectsTab } from '@/components/apps/repo/ProjectsTab';
import { PackagesTab } from '@/components/apps/repo/PackagesTab';
import {
  GITHUB_README,
  GITHUB_REPOS,
  GITHUB_STARRED,
  GITHUB_USER,
  LINKED_GITHUB_ACCOUNTS,
  ME,
} from '@/lib/graphql-modules';
import { parseLinkedGithubAccounts, type LinkedGithubAccount } from '@/lib/linked-github-accounts';
import { CACHE_TTL_MS } from '@/lib/local-cache';

type TabId = 'overview' | 'repos' | 'stars' | 'projects' | 'packages';

type ProfileSelection =
  | { kind: 'default' }
  | { kind: 'explicit'; username: string; githubUserId: string | null };

const TAB_ICONS: Record<TabId, React.ElementType> = {
  overview: BookOpen,
  repos: LayoutGrid,
  stars: Star,
  projects: Briefcase,
  packages: Package,
};

function StatusBanner({
  authed,
  linkedAccountsLength,
  tokenGithubUserId,
  activeUsername,
}: {
  authed: boolean;
  linkedAccountsLength: number;
  tokenGithubUserId: string | null;
  activeUsername: string | null;
}) {
  if (!authed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.07] px-3 py-2 text-[11px] text-sky-200/80">
        <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />
        <span>
          Browse public GitHub profiles without signing in. Sign in and link GitHub in{' '}
          <span className="font-semibold text-sky-300">Settings → Accounts</span> for private data
          &amp; higher rate limits.
        </span>
      </div>
    );
  }
  if (linkedAccountsLength === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2 text-[11px] text-amber-200/80">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>
          No GitHub account linked.{' '}
          <span className="font-semibold text-amber-300">Settings → Accounts → GitHub</span> to
          connect via Firebase OAuth.
        </span>
      </div>
    );
  }
  if (!tokenGithubUserId) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55">
        <Info className="h-3.5 w-3.5 shrink-0 text-white/40" />
        <span>
          Viewing <span className="font-mono font-medium text-white/80">@{activeUsername}</span> via{' '}
          <strong className="text-white/70">public</strong> API. Select a linked account for
          authenticated access.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[11px] text-emerald-200/80">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      <span>
        Authenticated as <span className="font-semibold text-emerald-300">@{activeUsername}</span>{' '}
        via linked GitHub token.
      </span>
    </div>
  );
}

function EmptyState({ onSearch }: { onSearch: (u: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
        <GithubIcon className="h-10 w-10 text-white/30" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-white/80">Explore GitHub profiles</h2>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-white/40">
        Search any GitHub username to load their profile, repositories, contribution graph, and more
        — fetched securely through the DurgasAI backend.
      </p>
      <div className="flex w-full max-w-sm gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && val.trim()) onSearch(val.trim());
            }}
            placeholder="e.g. torvalds, gaearon..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 pl-9 pr-3 text-sm text-white/90 outline-none focus:border-violet-400/30 placeholder:text-white/25"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (val.trim()) onSearch(val.trim());
          }}
          className="rounded-xl bg-violet-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Search
        </button>
      </div>
    </div>
  );
}

export function RepoApp() {
  const client = useApolloClient();
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);
  const meId = meQ.data?.me?.id ?? '';

  const linkedQ = useQuery(LINKED_GITHUB_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });

  const linkedAccounts = useMemo(
    () => parseLinkedGithubAccounts(linkedQ.data?.linkedGithubAccounts),
    [linkedQ.data?.linkedGithubAccounts]
  );

  const defaultLinked = useMemo(() => {
    if (!authed || linkedQ.loading || linkedAccounts.length === 0) return null;
    const first = linkedAccounts[0];
    const login = first?.login?.trim();
    if (!login) return null;
    return { login, githubUserId: first.githubUserId };
  }, [authed, linkedQ.loading, linkedAccounts]);

  const [profileSelection, setProfileSelection] = useState<ProfileSelection>({ kind: 'default' });
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [localRepos, setLocalRepos] = useState<Repository[]>([]);

  const activeUsername = useMemo(() => {
    if (profileSelection.kind === 'explicit') return profileSelection.username;
    return defaultLinked?.login ?? null;
  }, [profileSelection, defaultLinked]);

  const tokenGithubUserId = useMemo(() => {
    if (profileSelection.kind === 'explicit') return profileSelection.githubUserId;
    return defaultLinked?.githubUserId ?? null;
  }, [profileSelection, defaultLinked]);

  const githubUserIdArg = tokenGithubUserId ?? undefined;

  const reposCacheKey = activeUsername
    ? `github_repos:${meId}:${activeUsername}:${githubUserIdArg ?? 'pub'}`
    : 'github_repos:__idle__';

  const reposCached = useCachedQuery<unknown>(
    reposCacheKey,
    async () => {
      if (!activeUsername) return null;
      const { data } = await client.query({
        query: GITHUB_REPOS,
        variables: {
          username: activeUsername,
          sort: 'updated',
          githubUserId: githubUserIdArg,
        },
        fetchPolicy: 'network-only',
      });
      return data?.githubRepos ?? null;
    },
    CACHE_TTL_MS.github_repos,
    { backgroundRefreshMs: 120_000 }
  );

  const mergedRepos = useMemo(() => {
    const remote = Array.isArray(reposCached.data) ? reposCached.data : [];
    return [...localRepos, ...remote];
  }, [localRepos, reposCached.data]);

  const userQ = useQuery(GITHUB_USER, {
    variables: { username: activeUsername ?? '', githubUserId: githubUserIdArg },
    skip: !activeUsername,
    fetchPolicy: 'cache-and-network',
  });

  const readmeQ = useQuery(GITHUB_README, {
    variables: { username: activeUsername ?? '', githubUserId: githubUserIdArg },
    skip: !activeUsername || activeTab !== 'overview',
    fetchPolicy: 'cache-and-network',
  });

  const starredQ = useQuery(GITHUB_STARRED, {
    variables: { username: activeUsername ?? '', githubUserId: githubUserIdArg },
    skip: !activeUsername,
    fetchPolicy: 'cache-and-network',
  });

  const userPayload = useMemo((): GithubUserPayload => {
    const d = userQ.data?.githubUser;
    if (!d || typeof d !== 'object') return null;
    return d as GithubUserPayload;
  }, [userQ.data?.githubUser]);

  const handleSearch = useCallback(
    (username: string) => {
      const u = username.trim();
      if (!u) return;
      const match = linkedAccounts.find((a) => a.login.toLowerCase() === u.toLowerCase());
      setProfileSelection({
        kind: 'explicit',
        username: u,
        githubUserId: match ? match.githubUserId : null,
      });
      setActiveTab('overview');
    },
    [linkedAccounts]
  );

  const handleAccountPick = useCallback((a: LinkedGithubAccount) => {
    const login = a.login?.trim();
    if (login) {
      setProfileSelection({
        kind: 'explicit',
        username: login,
        githubUserId: a.githubUserId,
      });
      setActiveTab('overview');
    }
  }, []);

  const tabs: { id: TabId; label: string; count?: number }[] = useMemo(() => {
    const nRepos = mergedRepos.length;
    const starred = starredQ.data?.githubStarred;
    const nStars = Array.isArray(starred) ? starred.length : undefined;
    return [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'repos' as const, label: 'Repositories', count: nRepos || undefined },
      { id: 'stars' as const, label: 'Stars', count: nStars },
      { id: 'projects' as const, label: 'Projects' },
      { id: 'packages' as const, label: 'Packages' },
    ];
  }, [mergedRepos.length, starredQ.data?.githubStarred]);

  const showEmptyGate = !activeUsername;

  return (
    <ModuleAppShell title="Repo" subtitle="GitHub profile · proxied via backend">
      <div className="flex flex-col gap-3">
        {/* Status banner */}
        <StatusBanner
          authed={authed}
          linkedAccountsLength={linkedAccounts.length}
          tokenGithubUserId={tokenGithubUserId}
          activeUsername={activeUsername}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Left Sidebar */}
          <div className="flex w-full flex-col gap-3 lg:w-[260px] lg:shrink-0">
            {/* Account Switcher */}
            {authed && linkedAccounts.length > 0 ? (
              <GitHubAccountPicker
                accounts={linkedAccounts}
                valueGithubUserId={tokenGithubUserId}
                onChange={handleAccountPick}
              />
            ) : null}

            {/* Search Bar */}
            <PublicSearchBar
              key={activeUsername ?? 'repo-search-empty'}
              initialValue={activeUsername ?? undefined}
              onSearch={handleSearch}
              disabled={userQ.loading && !!activeUsername}
            />

            {/* Profile Card */}
            {!showEmptyGate ? (
              <>
                <GitHubProfileCard user={userPayload} />

                {/* Bento Navigation — icon + label like the reference */}
                <nav className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  <div className="flex flex-col gap-0.5">
                    {tabs.map((t) => {
                      const Icon = TAB_ICONS[t.id];
                      const active = activeTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTab(t.id)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all duration-150 ${
                            active
                              ? 'bg-violet-500/20 font-semibold text-white shadow-sm'
                              : 'font-medium text-white/60 hover:bg-white/[0.06] hover:text-white/85'
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${active ? 'text-violet-400' : 'text-white/35'}`}
                          />
                          <span className="flex-1">{t.label}</span>
                          {typeof t.count === 'number' && t.count > 0 ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                active
                                  ? 'bg-violet-500/30 text-violet-200'
                                  : 'bg-white/[0.08] text-white/40'
                              }`}
                            >
                              {t.count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </nav>

                {/* Contribution Graph — visible on mobile only (lg hidden in OverviewTab) */}
                <div className="lg:hidden">
                  <ContributionGraph />
                </div>
              </>
            ) : null}
          </div>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1">
            {showEmptyGate ? (
              <EmptyState onSearch={handleSearch} />
            ) : activeTab === 'overview' ? (
              <OverviewTab
                user={userPayload}
                readme={readmeQ.data?.githubReadme}
                repos={mergedRepos}
                readmeLoading={readmeQ.loading}
              />
            ) : activeTab === 'repos' ? (
              <RepositoriesTab
                repos={mergedRepos}
                loading={reposCached.loading}
                error={reposCached.error ?? undefined}
                onCreateRepo={(newRepo) => setLocalRepos((prev) => [newRepo, ...prev])}
              />
            ) : activeTab === 'stars' ? (
              <StarsTab
                starred={starredQ.data?.githubStarred}
                loading={starredQ.loading}
                error={starredQ.error ?? undefined}
              />
            ) : activeTab === 'projects' ? (
              <ProjectsTab username={activeUsername ?? ''} repos={mergedRepos} />
            ) : (
              <PackagesTab />
            )}
          </div>
        </div>

        {userQ.error ? <p className="text-xs text-red-300/90">{userQ.error.message}</p> : null}
      </div>
    </ModuleAppShell>
  );
}
