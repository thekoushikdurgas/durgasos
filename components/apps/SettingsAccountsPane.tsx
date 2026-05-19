'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
import {
  ADD_LINKED_GOOGLE_ACCOUNT,
  LINKED_GOOGLE_ACCOUNTS,
  REFRESH_LINKED_GOOGLE_ACCOUNT_TOKEN,
  REMOVE_LINKED_GOOGLE_ACCOUNT,
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

  const [error, setError] = useState<string | null>(null);
  const [busyGoogleUserId, setBusyGoogleUserId] = useState<string | null>(null);

  const accounts = useMemo(
    () => parseLinkedGoogleAccounts(listQ.data?.linkedGoogleAccounts),
    [listQ.data?.linkedGoogleAccounts]
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
    </div>
  );
}
