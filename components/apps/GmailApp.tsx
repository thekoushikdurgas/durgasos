'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOS } from '@/components/os-context';
import { GmailHeader } from '@/components/apps/gmail/GmailHeader';
import { GmailList, type GmailThreadRow } from '@/components/apps/gmail/GmailList';
import { GmailReader } from '@/components/apps/gmail/GmailReader';
import { GmailSidebar } from '@/components/apps/gmail/GmailSidebar';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { buildGmailListQuery, type GmailFolderId } from '@/lib/gmail-format';
import {
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
  GMAIL_GET_THREAD,
  GMAIL_LIST_THREADS,
  LINKED_GOOGLE_ACCOUNTS,
  ME,
} from '@/lib/graphql-modules';
import { parseLinkedGoogleAccounts } from '@/lib/linked-google-accounts';
import { CACHE_TTL_MS } from '@/lib/local-cache';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';
import { cn } from '@/lib/utils';

type ListThreadsPayload = {
  success?: boolean;
  threads?: GmailThreadRow[];
  nextPageToken?: string | null;
};

type GetThreadPayload = {
  success?: boolean;
  thread?: Record<string, unknown>;
};

export function GmailApp() {
  const client = useApolloClient();
  const { openApp } = useOS();
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);
  const meId = meQ.data?.me?.id ?? '';

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

  const [folder, setFolder] = useState<GmailFolderId>('inbox');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [threads, setThreads] = useState<GmailThreadRow[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadJson, setThreadJson] = useState<Record<string, unknown> | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadErr, setThreadErr] = useState<string | null>(null);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [composeNote, setComposeNote] = useState<string | null>(null);

  const listQueryString = useMemo(
    () => buildGmailListQuery(folder, searchApplied),
    [folder, searchApplied]
  );

  const listCacheKey =
    accessToken && googleUserId && meId
      ? `gmail_messages:${meId}:${googleUserId}:${folder}:${searchApplied}`
      : 'gmail_messages:__idle__';

  const threadListCached = useCachedQuery<ListThreadsPayload | null>(
    listCacheKey,
    async () => {
      if (!accessToken || !googleUserId || !meId) return null;
      const { data } = await client.query({
        query: GMAIL_LIST_THREADS,
        variables: {
          params: {
            access_token: accessToken,
            max_results: 25,
            page_token: undefined,
            q: listQueryString,
          },
        },
        fetchPolicy: 'network-only',
      });
      return (data?.gmailListThreads as ListThreadsPayload | undefined) ?? null;
    },
    CACHE_TTL_MS.gmail_messages,
    { backgroundRefreshMs: 30_000 }
  );

  useEffect(() => {
    if (!accessToken) {
      queueMicrotask(() => {
        setThreads([]);
        setNextPageToken(null);
        setSelectedThreadId(null);
        setThreadJson(null);
        setListErr(null);
      });
      return;
    }
    const p = threadListCached.data;
    const fetchErr = threadListCached.error?.message ?? null;
    if (p === null && threadListCached.loading) return;
    queueMicrotask(() => {
      if (fetchErr) {
        setListErr(fetchErr);
        return;
      }
      if (p === null) {
        setListErr(null);
        return;
      }
      if (!p.success) {
        setListErr('Could not load conversations.');
        return;
      }
      setListErr(null);
      setThreads(p.threads ?? []);
      setNextPageToken(p.nextPageToken ?? null);
    });
  }, [
    accessToken,
    threadListCached.data,
    threadListCached.loading,
    threadListCached.error,
    listCacheKey,
    listQueryString,
  ]);

  useEffect(() => {
    if (!accessToken) return;
    queueMicrotask(() => {
      setSelectedThreadId(null);
      setThreadJson(null);
    });
  }, [accessToken, listQueryString, listCacheKey]);

  const loadThreads = useCallback(
    async (pageToken: string | null, append: boolean) => {
      if (!accessToken || !append || !pageToken) return;
      setListErr(null);
      setListLoading(true);
      try {
        const { data } = await client.query({
          query: GMAIL_LIST_THREADS,
          variables: {
            params: {
              access_token: accessToken,
              max_results: 25,
              page_token: pageToken,
              q: listQueryString,
            },
          },
          fetchPolicy: 'network-only',
        });
        const p = data?.gmailListThreads as ListThreadsPayload | undefined;
        if (!p?.success) {
          setListErr('Could not load conversations.');
          return;
        }
        const chunk = p.threads ?? [];
        setThreads((prev) => [...prev, ...chunk]);
        setNextPageToken(p.nextPageToken ?? null);
      } catch (e: unknown) {
        setListErr(e instanceof Error ? e.message : 'List failed.');
      } finally {
        setListLoading(false);
      }
    },
    [accessToken, client, listQueryString]
  );

  const openThread = useCallback(
    async (threadId: string) => {
      if (!accessToken) return;
      setSelectedThreadId(threadId);
      setThreadJson(null);
      setThreadErr(null);
      setThreadLoading(true);
      try {
        const { data } = await client.query({
          query: GMAIL_GET_THREAD,
          variables: {
            params: { access_token: accessToken, thread_id: threadId, format: 'metadata' },
          },
          fetchPolicy: 'network-only',
        });
        const p = data?.gmailGetThread as GetThreadPayload | undefined;
        if (!p?.success || !p.thread) {
          setThreadErr('Could not load this conversation.');
          return;
        }
        setThreadJson(p.thread);
      } catch (e: unknown) {
        setThreadErr(e instanceof Error ? e.message : 'Open failed.');
      } finally {
        setThreadLoading(false);
      }
    },
    [accessToken, client]
  );

  const handleSearchSubmit = useCallback(() => {
    setSearchApplied(searchDraft.trim());
  }, [searchDraft]);

  const handleFolder = useCallback((f: GmailFolderId) => {
    setFolder(f);
    setMobileNavOpen(false);
  }, []);

  if (!authed) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Sign in to the desktop to use Gmail.
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
      <GmailHeader
        accounts={accounts}
        googleUserId={googleUserId}
        onGoogleUserId={setGoogleUserId}
        searchDraft={searchDraft}
        onSearchDraft={setSearchDraft}
        onSearchSubmit={handleSearchSubmit}
        mobileNavOpen={mobileNavOpen}
        onToggleNav={() => setMobileNavOpen((v) => !v)}
      />

      {composeNote ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sky-500/20 bg-sky-950/40 px-3 py-2 text-xs text-sky-100/90">
          <span>{composeNote}</span>
          <button
            type="button"
            className="text-sky-300 underline hover:text-sky-200"
            onClick={() => setComposeNote(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <GmailSidebar
          folder={folder}
          onFolder={handleFolder}
          onCompose={() => {
            setComposeNote(
              'Sending mail needs extra OAuth scopes. Open Gmail in the browser to compose.'
            );
            setMobileNavOpen(false);
          }}
          className={cn(!mobileNavOpen && 'hidden', 'md:flex')}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:flex-row md:gap-3 md:p-3">
          {!accessToken && tokenQ.loading ? (
            <p className="p-3 text-xs text-white/40">Loading token…</p>
          ) : !accessToken ? (
            <p className="p-3 text-xs text-amber-200/90">
              No access token. Re-link your Google account in Settings.
            </p>
          ) : (
            <>
              <GmailList
                threads={threads}
                selectedThreadId={selectedThreadId}
                onSelectThread={(id) => void openThread(id)}
                loading={threadListCached.loading || listLoading}
                error={listErr ?? threadListCached.error?.message ?? null}
                nextPageToken={nextPageToken}
                onLoadMore={() => void loadThreads(nextPageToken, true)}
              />
              <GmailReader
                threadId={selectedThreadId}
                threadJson={threadJson}
                loading={threadLoading}
                error={threadErr}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
