'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';

import { fetchGoogleDriveBlob } from '@/lib/google-drive-media';
import { GET_LINKED_GOOGLE_ACCOUNT_TOKEN } from '@/lib/graphql-modules';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';
import type { LaunchPayload } from '@/lib/window-launch';

/** Resolve a blob object URL for `launch.googleDrive` (revoked on unmount). */
export function useGoogleDriveLaunchSource(launch: Partial<LaunchPayload> | undefined): {
  objectUrl: string | null;
  loading: boolean;
  error: string | null;
} {
  const gd = launch?.googleDrive;
  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !gd?.googleUserId,
    variables: { googleUserId: gd?.googleUserId ?? '' },
    fetchPolicy: 'network-only',
  });
  const accessToken = readGoogleTokenPayload(tokenQ.data?.getLinkedGoogleAccountToken).accessToken;

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gd?.fileId || !accessToken) {
      queueMicrotask(() => {
        setObjectUrl(null);
        setError(null);
        setLoading(Boolean(gd?.fileId) && tokenQ.loading);
      });
      return;
    }
    let cancelled = false;
    let revoked: string | null = null;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    void fetchGoogleDriveBlob(accessToken, gd.fileId, gd.mimeType)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setObjectUrl(url);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setObjectUrl(null);
        setError(e instanceof Error ? e.message : 'Failed to load Google Drive file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [gd?.fileId, gd?.mimeType, accessToken, tokenQ.loading]);

  return {
    objectUrl,
    loading: loading || (Boolean(gd?.fileId) && tokenQ.loading && !accessToken),
    error,
  };
}
