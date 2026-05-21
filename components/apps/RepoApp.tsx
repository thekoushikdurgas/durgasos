'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';

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
import { RepositoriesTab } from '@/components/apps/repo/RepositoriesTab';
import { StarsTab } from '@/components/apps/repo/StarsTab';
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

type TabId = 'overview' | 'repos' | 'stars';

type ProfileSelection =
  | { kind: 'default' }
  | { kind: 'explicit'; username: string; githubUserId: string | null };

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
    const repos = reposCached.data;
    const nRepos = Array.isArray(repos) ? repos.length : undefined;
    const starred = starredQ.data?.githubStarred;
    const nStars = Array.isArray(starred) ? starred.length : undefined;
    return [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'repos' as const, label: 'Repositories', count: nRepos },
      { id: 'stars' as const, label: 'Stars', count: nStars },
    ];
  }, [reposCached.data, starredQ.data?.githubStarred]);

  const showEmptyGate = !activeUsername;

  return (
    <ModuleAppShell title="Repo" subtitle="GitHub profile · proxied via backend">
      <div className="space-y-4">
        {!authed ? (
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs text-sky-100/90">
            You can browse public GitHub profiles without signing in. Sign in to the desktop and
            link GitHub in Settings → Accounts for higher rate limits and private-visible data your
            token allows.
          </div>
        ) : linkedAccounts.length === 0 ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
            No GitHub account linked. Open Settings → Accounts → GitHub to connect with Firebase,
            then return here to use your token-backed requests.
          </div>
        ) : !tokenGithubUserId ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
            Viewing <span className="font-mono text-white/85">{activeUsername}</span> via{' '}
            <strong>public</strong> API. Select a linked account or search your own login to use an
            authenticated token.
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[11px] text-emerald-100/90">
            Using linked GitHub token for @{activeUsername}.
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex w-full flex-col gap-4 lg:max-w-xs lg:shrink-0">
            {authed && linkedAccounts.length > 0 ? (
              <GitHubAccountPicker
                accounts={linkedAccounts}
                valueGithubUserId={tokenGithubUserId}
                onChange={handleAccountPick}
              />
            ) : null}

            <PublicSearchBar
              key={activeUsername ?? 'repo-search-empty'}
              initialValue={activeUsername ?? undefined}
              onSearch={handleSearch}
              disabled={userQ.loading && !!activeUsername}
            />

            {!showEmptyGate ? (
              <>
                <GitHubProfileCard user={userPayload} />
                <nav className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        activeTab === t.id
                          ? 'bg-violet-500/30 text-white'
                          : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {t.label}
                      {typeof t.count === 'number' ? (
                        <span className="ml-1 text-white/40">({t.count})</span>
                      ) : null}
                    </button>
                  ))}
                </nav>
                <div className="lg:hidden">
                  <ContributionGraph />
                </div>
              </>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            {showEmptyGate ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
                <p className="mb-4 max-w-sm text-sm text-white/50">
                  Enter a GitHub username to load profile, repositories, and stars. Data is fetched
                  through your DurgasAI backend.
                </p>
              </div>
            ) : activeTab === 'overview' ? (
              <OverviewTab
                user={userPayload}
                readme={readmeQ.data?.githubReadme}
                repos={reposCached.data}
                readmeLoading={readmeQ.loading}
              />
            ) : activeTab === 'repos' ? (
              <RepositoriesTab
                repos={reposCached.data}
                loading={reposCached.loading}
                error={reposCached.error ?? undefined}
              />
            ) : (
              <StarsTab
                starred={starredQ.data?.githubStarred}
                loading={starredQ.loading}
                error={starredQ.error ?? undefined}
              />
            )}
          </div>
        </div>

        {userQ.error ? <p className="text-xs text-red-300/90">{userQ.error.message}</p> : null}
      </div>
    </ModuleAppShell>
  );
}
