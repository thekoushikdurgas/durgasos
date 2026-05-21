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
      <div className="frost-glass-surface rounded-2xl border border-white/10 p-6 text-sm text-white/60">
        Sign in to the desktop (email/password) to link Google accounts for Gallery and other apps.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
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

      <section className="frost-glass-surface rounded-2xl border border-white/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white/90">Linked GitHub accounts</h2>
        <p className="mb-4 text-sm text-white/50">
          Link GitHub via Firebase for the Repo app and higher GitHub API rate limits. Enable the
          GitHub provider in the Firebase console and add your OAuth app credentials there.
        </p>

        {!isFirebaseConfigured() ? (
          <p className="mb-4 text-xs text-amber-200/90">
            Set NEXT_PUBLIC_FIREBASE_* to enable GitHub sign-in (same as Google linking).
          </p>
        ) : null}

        <button
          type="button"
          disabled={addGhBusy || !isFirebaseConfigured()}
          onClick={() => void handleAddGithub()}
          className="mb-6 rounded-full border border-violet-400/40 bg-violet-500/20 px-5 py-2 text-sm font-medium text-violet-50 transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addGhBusy ? 'Opening GitHub…' : 'Add GitHub account'}
        </button>

        {ghListQ.loading && githubAccounts.length === 0 ? (
          <p className="text-xs text-white/40">Loading GitHub accounts…</p>
        ) : githubAccounts.length === 0 ? (
          <p className="text-sm text-white/45">No GitHub accounts linked yet.</p>
        ) : (
          <ul className="space-y-3">
            {githubAccounts.map((a) => {
              const label = a.login?.trim() || a.displayName?.trim() || a.githubUserId;
              const rowBusy = busyGithubUserId === a.githubUserId && removeGhBusy;

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
                    {a.login ? <p className="truncate text-xs text-white/45">@{a.login}</p> : null}
                    {a.email ? <p className="truncate text-xs text-white/45">{a.email}</p> : null}
                    <p className="mt-1 font-mono text-[10px] text-white/35">id {a.githubUserId}</p>
                  </div>
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => void handleRemoveGithub(a.githubUserId)}
                    className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-red-200/90 hover:bg-white/10 disabled:opacity-50"
                  >
                    {rowBusy ? '…' : 'Remove'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
