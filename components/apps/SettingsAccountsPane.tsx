'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from 'firebase/auth';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
  Lock,
  Info,
  User,
} from 'lucide-react';

// GitHub Octocat SVG (lucide-react v1.16.0 doesn't include Github)
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { configureGoogleLinkProvider, GOOGLE_SCOPES_GRANTED_STRING } from '@/lib/google-link-auth';
import { googleScopeBadgeLabels } from '@/lib/google-scope-badges';
import {
  defaultGoogleOAuthExpiryEpoch,
  isGoogleAccessLikelyExpired,
  parseLinkedGoogleAccounts,
} from '@/lib/linked-google-accounts';
import { parseLinkedGithubAccounts } from '@/lib/linked-github-accounts';
import {
  ADD_LINKED_GOOGLE_ACCOUNT,
  LINKED_GOOGLE_ACCOUNTS,
  REFRESH_LINKED_GOOGLE_ACCOUNT_TOKEN,
  REMOVE_LINKED_GOOGLE_ACCOUNT,
  LINKED_GITHUB_ACCOUNTS,
  ADD_LINKED_GITHUB_ACCOUNT,
  REMOVE_LINKED_GITHUB_ACCOUNT,
  ME,
} from '@/lib/graphql-modules';

export function SettingsAccountsPane() {
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);

  const listQ = useQuery(LINKED_GOOGLE_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });

  const [addMut, { loading: addBusy }] = useMutation(ADD_LINKED_GOOGLE_ACCOUNT);
  const [removeMut, { loading: removeBusy }] = useMutation(REMOVE_LINKED_GOOGLE_ACCOUNT);
  const [refreshMut, { loading: refreshBusy }] = useMutation(REFRESH_LINKED_GOOGLE_ACCOUNT_TOKEN);

  const ghListQ = useQuery(LINKED_GITHUB_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });
  const [addGhMut, { loading: addGhBusy }] = useMutation(ADD_LINKED_GITHUB_ACCOUNT);
  const [removeGhMut, { loading: removeGhBusy }] = useMutation(REMOVE_LINKED_GITHUB_ACCOUNT);

  const [error, setError] = useState<string | null>(null);
  const [busyGoogleUserId, setBusyGoogleUserId] = useState<string | null>(null);
  const [busyGithubUserId, setBusyGithubUserId] = useState<string | null>(null);

  const accounts = useMemo(
    () => parseLinkedGoogleAccounts(listQ.data?.linkedGoogleAccounts),
    [listQ.data?.linkedGoogleAccounts]
  );

  const githubAccounts = useMemo(
    () => parseLinkedGithubAccounts(ghListQ.data?.linkedGithubAccounts),
    [ghListQ.data?.linkedGithubAccounts]
  );

  const runGooglePopup = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to your environment.');
      return null;
    }
    const provider = new GoogleAuthProvider();
    configureGoogleLinkProvider(provider);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) {
      setError('Google did not return an OAuth access token. Try again.');
      return null;
    }
    const user = result.user;
    const googleUserId = user.uid;
    const email = user.email ?? '';
    const displayName = user.displayName ?? undefined;
    const photoUrl = user.photoURL ?? undefined;
    const tokenExpiresAt = defaultGoogleOAuthExpiryEpoch();
    return {
      accessToken,
      googleUserId,
      email,
      displayName,
      photoUrl,
      tokenExpiresAt,
      scopesGranted: GOOGLE_SCOPES_GRANTED_STRING,
    };
  }, []);

  const handleAdd = useCallback(async () => {
    setError(null);
    try {
      const payload = await runGooglePopup();
      if (!payload) return;
      await addMut({
        variables: {
          params: {
            access_token: payload.accessToken,
            google_user_id: payload.googleUserId,
            email: payload.email,
            display_name: payload.displayName,
            photo_url: payload.photoUrl,
            token_expires_at: payload.tokenExpiresAt,
            scopes_granted: payload.scopesGranted,
          },
        },
      });
      await listQ.refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add Google account.');
    }
  }, [addMut, listQ, runGooglePopup]);

  const runGithubPopup = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to your environment.');
      return null;
    }
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) {
      setError('GitHub did not return an OAuth access token. Try again.');
      return null;
    }
    const more = getAdditionalUserInfo(result);
    const profile = (more?.profile ?? {}) as Record<string, unknown>;
    const fromProfile = profile.id;
    const fromProvider = result.user.providerData.find((p) => p?.providerId === 'github.com')?.uid;
    const rawId = fromProfile !== undefined && fromProfile !== null ? fromProfile : fromProvider;
    const githubUserId = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
    if (!githubUserId) {
      setError('Could not read GitHub user id from Firebase.');
      return null;
    }
    const login = typeof profile.login === 'string' ? profile.login : '';
    const email =
      typeof profile.email === 'string'
        ? profile.email
        : (result.user.email ?? '').replace(/@github\.local$/, '') || '';
    const displayName =
      typeof profile.name === 'string' ? profile.name : (result.user.displayName ?? undefined);
    const photoUrl =
      typeof profile.avatar_url === 'string'
        ? profile.avatar_url
        : (result.user.photoURL ?? undefined);
    return {
      accessToken,
      githubUserId,
      login,
      email,
      displayName,
      photoUrl,
    };
  }, []);

  const handleAddGithub = useCallback(async () => {
    setError(null);
    try {
      const payload = await runGithubPopup();
      if (!payload) return;
      await addGhMut({
        variables: {
          params: {
            access_token: payload.accessToken,
            github_user_id: payload.githubUserId,
            login: payload.login,
            email: payload.email,
            display_name: payload.displayName,
            photo_url: payload.photoUrl,
          },
        },
      });
      await ghListQ.refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add GitHub account.');
    }
  }, [addGhMut, ghListQ, runGithubPopup]);

  const handleRemoveGithub = useCallback(
    async (githubUserId: string) => {
      setError(null);
      setBusyGithubUserId(githubUserId);
      try {
        await removeGhMut({ variables: { githubUserId } });
        await ghListQ.refetch();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Remove failed.');
      } finally {
        setBusyGithubUserId(null);
      }
    },
    [ghListQ, removeGhMut]
  );

  const handleRemove = useCallback(
    async (googleUserId: string) => {
      setError(null);
      setBusyGoogleUserId(googleUserId);
      try {
        await removeMut({ variables: { googleUserId } });
        await listQ.refetch();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Remove failed.');
      } finally {
        setBusyGoogleUserId(null);
      }
    },
    [listQ, removeMut]
  );

  const handleReauth = useCallback(
    async (googleUserId: string) => {
      setError(null);
      setBusyGoogleUserId(googleUserId);
      try {
        const payload = await runGooglePopup();
        if (!payload || payload.googleUserId !== googleUserId) {
          setError('Sign in with the same Google account to refresh the token.');
          return;
        }
        await refreshMut({
          variables: {
            googleUserId,
            accessToken: payload.accessToken,
            expiresAt: payload.tokenExpiresAt,
            scopesGranted: payload.scopesGranted,
          },
        });
        await listQ.refetch();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Re-authentication failed.');
      } finally {
        setBusyGoogleUserId(null);
      }
    },
    [listQ, refreshMut, runGooglePopup]
  );

  if (!authed) {
    return (
      <div className="frost-glass-surface mb-0 border border-white/10 p-6 text-sm text-white/60">
        Sign in to the desktop (email/password) to link Google accounts for Gallery and other apps.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="frost-glass-surface mb-0 border border-white/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white/90">Linked Google accounts</h2>
        <p className="mb-4 text-sm text-white/50">
          Link a Google account for Photos, Gmail, Calendar, Contacts, and Drive (read-only OAuth
          scopes). Tokens are stored for this OS user and expire about every hour — use
          Re-authenticate when prompted.
        </p>

        {!isFirebaseConfigured() ? (
          <p className="mb-4 text-xs text-amber-200/90">
            Set NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID to enable Google
            sign-in.
          </p>
        ) : null}

        {error ? <p className="mb-3 text-xs text-red-300/90">{error}</p> : null}

        <button
          type="button"
          disabled={addBusy || !isFirebaseConfigured()}
          onClick={() => void handleAdd()}
          className="mb-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addBusy ? 'Opening Google…' : 'Add Google account'}
        </button>

        {listQ.loading && accounts.length === 0 ? (
          <p className="text-xs text-white/40">Loading linked accounts…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-white/45">No Google accounts linked yet.</p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((a) => {
              const label = a.displayName?.trim() || a.email || a.googleUserId;
              const sub = a.email && a.displayName?.trim() ? a.email : null;
              const scopeBadges = googleScopeBadgeLabels(a.scopesGranted);
              const expired = isGoogleAccessLikelyExpired(a.tokenExpiresAt);
              const rowBusy = busyGoogleUserId === a.googleUserId && (removeBusy || refreshBusy);

              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                >
                  {a.photoUrl ? (
                    <Image
                      src={a.photoUrl}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-medium text-white/70">
                      {(label[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">{label}</p>
                    {sub ? <p className="truncate text-xs text-white/45">{sub}</p> : null}
                    {scopeBadges.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {scopeBadges.map((b) => (
                          <span
                            key={b}
                            className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/60"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-amber-200/80">
                        Re-authenticate to store granted scopes for this link.
                      </p>
                    )}
                    {expired ? (
                      <p className="mt-1 text-[11px] text-amber-200/90">
                        Access token expired or expiring soon.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {expired ? (
                      <button
                        type="button"
                        disabled={rowBusy || !isFirebaseConfigured()}
                        onClick={() => void handleReauth(a.googleUserId)}
                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        Re-authenticate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => void handleRemove(a.googleUserId)}
                      className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-red-200/90 hover:bg-white/10 disabled:opacity-50"
                    >
                      {rowBusy ? '…' : 'Remove'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="frost-glass-surface mb-0 overflow-hidden border border-white/10">
        {/* GitHub Section Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/15">
              <GithubIcon className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white/90">Linked GitHub accounts</h2>
          </div>
          <p className="ml-11 text-sm text-white/50">
            Connect GitHub via Firebase OAuth to enable authenticated Repo app access, private
            repository visibility, and higher API rate limits.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Firebase not configured warning */}
          {!isFirebaseConfigured() ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-amber-200/80">
                Set{' '}
                <code className="rounded bg-amber-500/15 px-1 py-0.5 text-xs text-amber-300">
                  NEXT_PUBLIC_FIREBASE_*
                </code>{' '}
                environment variables to enable GitHub sign-in.
              </p>
            </div>
          ) : null}

          {/* Error display */}
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200/90">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Connect Button */}
          <button
            type="button"
            disabled={addGhBusy || !isFirebaseConfigured()}
            onClick={() => void handleAddGithub()}
            className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-100 transition-all hover:border-violet-400/40 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addGhBusy ? (
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            ) : (
              <GithubIcon className="h-4 w-4 text-violet-400" />
            )}
            {addGhBusy ? 'Opening GitHub OAuth…' : 'Connect GitHub Account'}
          </button>

          {/* Accounts List */}
          {ghListQ.loading && githubAccounts.length === 0 ? (
            <p className="text-xs text-white/40">Loading GitHub accounts…</p>
          ) : githubAccounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
                <GithubIcon className="h-7 w-7 text-white/20" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/60">No GitHub accounts connected</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Click &ldquo;Connect GitHub Account&rdquo; above to link your first account
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {githubAccounts.map((a) => {
                const label = a.login?.trim() || a.displayName?.trim() || a.githubUserId;
                const rowBusy = busyGithubUserId === a.githubUserId && removeGhBusy;
                const initial = (label[0] ?? '?').toUpperCase();
                const ghUrl = a.login ? `https://github.com/${a.login}` : null;

                return (
                  <li
                    key={a.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    {/* Account Header */}
                    <div className="flex items-center gap-4 p-4">
                      {/* Avatar */}
                      {a.photoUrl ? (
                        <Image
                          src={a.photoUrl}
                          alt=""
                          width={48}
                          height={48}
                          unoptimized
                          className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover shadow-lg"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-indigo-600/10 text-base font-bold text-white/70">
                          {initial}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-white/90">
                            {a.displayName?.trim() || label}
                          </p>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        </div>
                        {a.login ? (
                          <p className="text-xs text-violet-300/80 font-mono">@{a.login}</p>
                        ) : null}
                        {a.email ? (
                          <p className="truncate text-xs text-white/40">{a.email}</p>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        {ghUrl ? (
                          <a
                            href={ghUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-sky-300 hover:bg-white/10 hover:text-sky-200 transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            GitHub
                          </a>
                        ) : null}
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => void handleRemoveGithub(a.githubUserId)}
                          className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-2.5 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-500/15 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rowBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          {rowBusy ? '…' : 'Disconnect'}
                        </button>
                      </div>
                    </div>

                    {/* Scope Badges + Meta Footer */}
                    <div className="border-t border-white/5 bg-white/[0.02] px-4 py-2.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-mono text-white/50">
                        repo:read
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-mono text-white/50">
                        user:read
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-mono text-white/50">
                        gist:read
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-white/25">
                        id {a.githubUserId}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Info Panel */}
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <Info className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-white/70">How GitHub OAuth works</p>
              <p className="text-[11px] leading-relaxed text-white/40">
                Signing in with GitHub via Firebase stores your access token securely in the
                DurgasAI backend. The Repo app uses this token to fetch repositories, contribution
                data, and private-visible content at higher API rate limits. Your token is never
                stored in the browser.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
