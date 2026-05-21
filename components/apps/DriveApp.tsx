'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import { useEffect, useMemo, useState } from 'react';

import { useOS } from '@/components/os-context';
import { useCachedQuery } from '@/hooks/use-cached-query';
import {
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
  GOOGLE_DRIVE_LIST_FILES,
  LINKED_GOOGLE_ACCOUNTS,
  ME,
} from '@/lib/graphql-modules';
import { parseLinkedGoogleAccounts } from '@/lib/linked-google-accounts';
import { CACHE_TTL_MS } from '@/lib/local-cache';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';

type DrivePayload = {
  success?: boolean;
  files?: Array<Record<string, unknown>>;
  nextPageToken?: string | null;
};

function mimeIcon(mime: string): string {
  if (mime === 'application/vnd.google-apps.folder') return '📁';
  if (mime.startsWith('image/')) return '🖼';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📄';
  return '📎';
}

export function DriveApp() {
  const { openApp } = useOS();
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);
  const meId = meQ.data?.me?.id ?? '';
  const client = useApolloClient();

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

  const driveCacheKey =
    accessToken && googleUserId && meId
      ? `drive_files:${meId}:${googleUserId}:root`
      : 'drive_files:__idle__';

  const driveCached = useCachedQuery<DrivePayload | null>(
    driveCacheKey,
    async () => {
      if (!accessToken || !googleUserId || !meId) return null;
      const { data } = await client.query({
        query: GOOGLE_DRIVE_LIST_FILES,
        variables: {
          params: {
            access_token: accessToken,
            page_size: 50,
            q: 'trashed = false',
          },
        },
        fetchPolicy: 'network-only',
      });
      return (data?.googleDriveListFiles as DrivePayload | undefined) ?? null;
    },
    CACHE_TTL_MS.drive_files,
    { backgroundRefreshMs: 45_000 }
  );

  const files = useMemo(() => {
    const p = driveCached.data;
    if (!p?.success || !Array.isArray(p.files)) return [];
    return p.files;
  }, [driveCached.data]);

  if (!authed) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Sign in to the desktop to use Drive.
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
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {!accessToken && tokenQ.loading ? (
          <p className="p-3 text-xs text-white/40">Loading token…</p>
        ) : !accessToken ? (
          <p className="p-3 text-xs text-amber-200/90">No access token. Re-link in Settings.</p>
        ) : driveCached.loading ? (
          <p className="p-3 text-xs text-white/40">Loading files…</p>
        ) : driveCached.error ? (
          <p className="p-3 text-xs text-red-300/90">{driveCached.error.message}</p>
        ) : (
          <table className="w-full min-w-[20rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/45">
                <th className="p-2">Type</th>
                <th className="p-2">Name</th>
                <th className="p-2">Modified</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => {
                const id = typeof f.id === 'string' ? f.id : `f-${i}`;
                const name = typeof f.name === 'string' ? f.name : id;
                const mime = typeof f.mimeType === 'string' ? f.mimeType : '';
                const mod = typeof f.modifiedTime === 'string' ? f.modifiedTime : '';
                const link = typeof f.webViewLink === 'string' ? f.webViewLink : '';
                return (
                  <tr key={id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-2 text-lg leading-none">{mimeIcon(mime)}</td>
                    <td className="max-w-[min(50vw,320px)] truncate p-2 font-medium text-white/90">
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:underline"
                        >
                          {name}
                        </a>
                      ) : (
                        name
                      )}
                    </td>
                    <td className="whitespace-nowrap p-2 text-white/45">{mod}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
