'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect, useMemo, useState } from 'react';

import { useOS } from '@/components/os-context';
import {
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
  GOOGLE_PEOPLE_LIST_CONTACTS,
  LINKED_GOOGLE_ACCOUNTS,
  ME,
} from '@/lib/graphql-modules';
import { parseLinkedGoogleAccounts } from '@/lib/linked-google-accounts';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';

type PeoplePayload = {
  success?: boolean;
  connections?: Array<Record<string, unknown>>;
  nextPageToken?: string | null;
};

export function ContactsApp() {
  const { openApp } = useOS();
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);

  const linkedQ = useQuery(LINKED_GOOGLE_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });
  const accounts = useMemo(
    () => parseLinkedGoogleAccounts(linkedQ.data?.linkedGoogleAccounts),
    [linkedQ.data?.linkedGoogleAccounts]
  );

  const [googleUserId, setGoogleUserId] = useState<string | null>(null);
  useEffect(() => {
    if (accounts.length === 0) {
      queueMicrotask(() => setGoogleUserId(null));
      return;
    }
    queueMicrotask(() => {
      setGoogleUserId((prev) => {
        if (prev && accounts.some((a) => a.googleUserId === prev)) return prev;
        return accounts[0]!.googleUserId;
      });
    });
  }, [accounts]);

  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || !googleUserId,
    variables: { googleUserId: googleUserId ?? '' },
    fetchPolicy: 'cache-and-network',
  });

  const accessToken = useMemo(() => {
    const raw = tokenQ.data?.getLinkedGoogleAccountToken;
    return readGoogleTokenPayload(raw).accessToken;
  }, [tokenQ.data?.getLinkedGoogleAccountToken]);

  const [q, setQ] = useState('');

  const peopleQ = useQuery(GOOGLE_PEOPLE_LIST_CONTACTS, {
    skip: !accessToken,
    variables: {
      params: {
        access_token: accessToken,
        page_size: 200,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const connections = useMemo(() => {
    const p = peopleQ.data?.googlePeopleListContacts as PeoplePayload | undefined;
    if (!p?.success || !Array.isArray(p.connections)) return [];
    return p.connections;
  }, [peopleQ.data?.googlePeopleListContacts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return connections;
    return connections.filter((c) => {
      const names = c.names as Array<Record<string, unknown>> | undefined;
      const emails = c.emailAddresses as Array<Record<string, unknown>> | undefined;
      const n0 = names?.[0];
      const display =
        n0 && typeof n0.displayName === 'string'
          ? n0.displayName
          : n0 && typeof n0.unstructuredName === 'string'
            ? String(n0.unstructuredName)
            : '';
      const em0 = emails?.[0];
      const em = em0 && typeof em0.value === 'string' ? em0.value : '';
      return `${display} ${em}`.toLowerCase().includes(needle);
    });
  }, [connections, q]);

  if (!authed) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Sign in to the desktop to use Contacts.
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-sm text-white/60">
        <p>No Google account linked.</p>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/90 hover:bg-white/10"
          onClick={() => openApp('settings', { settingsTab: 'Accounts' })}
        >
          Open Settings → Accounts
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <span className="text-xs text-white/45">Account</span>
          <select
            aria-label="Linked Google account"
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white"
            value={googleUserId ?? ''}
            onChange={(e) => setGoogleUserId(e.target.value || null)}
          >
            {accounts.map((a) => (
              <option key={a.googleUserId} value={a.googleUserId}>
                {a.displayName?.trim() || a.email || a.googleUserId}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Filter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/30"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!accessToken && tokenQ.loading ? (
          <p className="text-xs text-white/40">Loading token…</p>
        ) : !accessToken ? (
          <p className="text-xs text-amber-200/90">No access token. Re-link in Settings.</p>
        ) : peopleQ.loading ? (
          <p className="text-xs text-white/40">Loading contacts…</p>
        ) : peopleQ.error ? (
          <p className="text-xs text-red-300/90">{peopleQ.error.message}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => {
              const resource = typeof c.resourceName === 'string' ? c.resourceName : `c-${i}`;
              const names = c.names as Array<Record<string, unknown>> | undefined;
              const emails = c.emailAddresses as Array<Record<string, unknown>> | undefined;
              const n0 = names?.[0];
              const display =
                n0 && typeof n0.displayName === 'string'
                  ? n0.displayName
                  : n0 && typeof n0.unstructuredName === 'string'
                    ? String(n0.unstructuredName)
                    : 'Unknown';
              const em0 = emails?.[0];
              const em = em0 && typeof em0.value === 'string' ? em0.value : '';
              return (
                <li
                  key={resource}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"
                >
                  <p className="font-medium text-white/90">{display}</p>
                  {em ? <p className="truncate text-xs text-white/50">{em}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
