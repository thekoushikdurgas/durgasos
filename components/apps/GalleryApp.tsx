'use client';

import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  BENTO_SPAN_PRESETS,
  InteractiveBentoGallery,
  type MediaItemType,
} from '@/components/ui/interactive-bento-gallery';
import { PortfolioGallery, type PortfolioImage } from '@/components/ui/portfolio-gallery';
import { useWindowLaunch } from '@/components/window-launch-context';
import { useOS } from '@/components/os-context';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import {
  defaultGoogleOAuthExpiryEpoch,
  isGoogleAccessLikelyExpired,
  parseLinkedGoogleAccounts,
} from '@/lib/linked-google-accounts';
import { configureGoogleLinkProvider, GOOGLE_SCOPES_GRANTED_STRING } from '@/lib/google-link-auth';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';
import {
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
  GOOGLE_PHOTOS_LIST,
  LINKED_GOOGLE_ACCOUNTS,
  ME,
  REFRESH_LINKED_GOOGLE_ACCOUNT_TOKEN,
  STORAGE_GET_URL,
  STORAGE_LIST,
} from '@/lib/graphql-modules';

const BUCKET_TYPE = 'uploads';
const LIST_LIMIT = 48;

type StorageListPayload = {
  success?: boolean;
  files?: Array<{ name: string; path: string; size: number }>;
};

type StorageUrlPayload = {
  success?: boolean;
  url?: string;
};

type GooglePhotosListPayload = {
  success?: boolean;
  mediaItems?: unknown[];
  nextPageToken?: string | null;
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|heic|tiff?|jxl|raw|cr2|nef|dng|psd)$/i;
const VIDEO_EXT =
  /\.(mp4|webm|mov|m4v|ogg|mkv|avi|wmv|flv|mpe?g|opus|wma|3gp|ts|aac|flac|m4a|mp3|wav)$/i;

function inferMediaType(path: string): 'image' | 'video' | null {
  if (VIDEO_EXT.test(path)) return 'video';
  if (IMAGE_EXT.test(path)) return 'image';
  return null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function resolveUrlsInChunks(
  paths: string[],
  resolveOne: (path: string) => Promise<string | null>,
  chunkSize: number
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(async (path) => {
        const url = await resolveOne(path);
        return [path, url] as const;
      })
    );
    for (const [path, url] of results) {
      if (url) out.set(path, url);
    }
  }
  return out;
}

function mapGoogleMediaItems(raw: unknown[] | undefined): MediaItemType[] {
  if (!Array.isArray(raw)) return [];
  let spanI = 0;
  const out: MediaItemType[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : null;
    const baseUrl = typeof item.baseUrl === 'string' ? item.baseUrl : '';
    const mime = typeof item.mimeType === 'string' ? item.mimeType : '';
    const filename = typeof item.filename === 'string' ? item.filename : (id ?? 'Media');
    if (!id || !baseUrl) continue;
    let type: 'image' | 'video' = 'image';
    if (mime.startsWith('video/')) type = 'video';
    else if (!mime.startsWith('image/')) continue;
    const url = type === 'video' ? `${baseUrl}=dv` : `${baseUrl}=w1920-h1080`;
    out.push({
      id,
      type,
      title: filename,
      desc: mime,
      url,
      span: BENTO_SPAN_PRESETS[spanI % BENTO_SPAN_PRESETS.length]!,
    });
    spanI += 1;
  }
  return out;
}

type SourceTab = 'workspace' | 'google';

export function GalleryApp() {
  const client = useApolloClient();
  const launch = useWindowLaunch();
  const { openApp } = useOS();
  const [sourceTab, setSourceTab] = useState<SourceTab>('workspace');
  const [view, setView] = useState<'face' | 'bento'>('face');
  const [launchImages, setLaunchImages] = useState<PortfolioImage[]>([]);
  const [selectedGoogleUserId, setSelectedGoogleUserId] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleTokenExpiresAt, setGoogleTokenExpiresAt] = useState<number | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [gpItems, setGpItems] = useState<MediaItemType[]>([]);
  const [gpNext, setGpNext] = useState<string | null>(null);
  const [gpLoadingMore, setGpLoadingMore] = useState(false);

  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);

  const linkedQ = useQuery(LINKED_GOOGLE_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });

  const linkedAccounts = useMemo(
    () => parseLinkedGoogleAccounts(linkedQ.data?.linkedGoogleAccounts),
    [linkedQ.data?.linkedGoogleAccounts]
  );

  useEffect(() => {
    if (linkedAccounts.length === 0) {
      queueMicrotask(() => {
        setSelectedGoogleUserId(null);
      });
      return;
    }
    queueMicrotask(() => {
      setSelectedGoogleUserId((prev) => {
        if (prev && linkedAccounts.some((a) => a.googleUserId === prev)) return prev;
        return linkedAccounts[0]!.googleUserId;
      });
    });
  }, [linkedAccounts]);

  useEffect(() => {
    queueMicrotask(() => {
      setGoogleAccessToken(null);
      setGoogleTokenExpiresAt(null);
    });
  }, [selectedGoogleUserId]);

  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || !selectedGoogleUserId,
    variables: { googleUserId: selectedGoogleUserId ?? '' },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!selectedGoogleUserId) return;
    if (tokenQ.loading) return;
    if (tokenQ.error) {
      const msg = tokenQ.error.message;
      queueMicrotask(() => {
        setGoogleAccessToken(null);
        setGoogleTokenExpiresAt(null);
        setGoogleError(msg);
      });
      return;
    }
    const raw = tokenQ.data?.getLinkedGoogleAccountToken;
    const { accessToken, expiresAt } = readGoogleTokenPayload(raw);
    if (accessToken) {
      queueMicrotask(() => {
        setGoogleAccessToken(accessToken);
        setGoogleTokenExpiresAt(expiresAt);
        setGoogleError(null);
      });
    } else {
      queueMicrotask(() => {
        setGoogleAccessToken(null);
        setGoogleTokenExpiresAt(null);
      });
    }
  }, [selectedGoogleUserId, tokenQ.data, tokenQ.loading, tokenQ.error]);

  const googlePhotosReady = useMemo(
    () =>
      Boolean(googleAccessToken) && !isGoogleAccessLikelyExpired(googleTokenExpiresAt ?? undefined),
    [googleAccessToken, googleTokenExpiresAt]
  );

  const listQ = useQuery(STORAGE_LIST, {
    skip: !authed || sourceTab !== 'workspace',
    variables: { params: { bucket_type: BUCKET_TYPE, limit: LIST_LIMIT, offset: 0 } },
    fetchPolicy: 'network-only',
  });

  const gpQ = useQuery(GOOGLE_PHOTOS_LIST, {
    skip: !authed || sourceTab !== 'google' || !googlePhotosReady,
    variables: { params: { access_token: googleAccessToken, page_size: 100 } },
    fetchPolicy: 'network-only',
  });

  const [getUrlMut] = useMutation(STORAGE_GET_URL);
  const [refreshGoogleTokenMut] = useMutation(REFRESH_LINKED_GOOGLE_ACCOUNT_TOKEN);
  const [urlMap, setUrlMap] = useState<Map<string, string>>(() => new Map());
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    const s = launch?.storage;
    const name = launch?.fileName ?? '';
    const pathKey = s?.file_path ?? name;
    if (!pathKey || inferMediaType(pathKey) !== 'image') {
      queueMicrotask(() => {
        setLaunchImages([]);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      if (s?.file_path) {
        try {
          const { data } = await getUrlMut({
            variables: { params: { bucket_type: s.bucket_type, file_path: s.file_path } },
          });
          const json = data?.storageGetUrl as StorageUrlPayload | undefined;
          if (json?.success && json.url && !cancelled) {
            setLaunchImages([{ src: json.url, alt: name || s.file_path }]);
          }
        } catch {
          if (!cancelled) setLaunchImages([]);
        }
      } else {
        if (!cancelled) setLaunchImages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launch?.storage, launch?.fileName, getUrlMut]);

  const listPayload = listQ.data?.storageList as StorageListPayload | undefined;

  const mediaPaths = useMemo(() => {
    const files = listPayload?.files ?? [];
    return files.map((f) => f.path).filter((p) => inferMediaType(p) !== null);
  }, [listPayload]);

  const resolveOne = useCallback(
    async (file_path: string) => {
      const { data } = await getUrlMut({
        variables: { params: { bucket_type: BUCKET_TYPE, file_path } },
      });
      const json = data?.storageGetUrl as StorageUrlPayload | undefined;
      if (json?.success && typeof json.url === 'string' && json.url.length > 0) {
        return json.url;
      }
      return null;
    },
    [getUrlMut]
  );

  useEffect(() => {
    if (!authed || sourceTab !== 'workspace') {
      queueMicrotask(() => {
        setUrlMap(new Map());
        setUrlLoading(false);
      });
      return;
    }
    if (!listPayload?.success || mediaPaths.length === 0) {
      queueMicrotask(() => {
        setUrlMap(new Map());
        setUrlLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setUrlLoading(true);
    });

    void (async () => {
      try {
        const m = await resolveUrlsInChunks(mediaPaths, resolveOne, 6);
        if (!cancelled) setUrlMap(m);
      } finally {
        if (!cancelled) setUrlLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed, sourceTab, listPayload, mediaPaths, resolveOne]);

  const workspaceMediaItems: MediaItemType[] = useMemo(() => {
    const files = listPayload?.files ?? [];
    const rows: MediaItemType[] = [];
    let spanI = 0;
    for (const f of files) {
      const type = inferMediaType(f.path);
      if (!type) continue;
      const url = urlMap.get(f.path);
      if (!url) continue;
      rows.push({
        id: f.path,
        type,
        title: f.name,
        desc: formatBytes(f.size),
        url,
        span: BENTO_SPAN_PRESETS[spanI % BENTO_SPAN_PRESETS.length]!,
      });
      spanI += 1;
    }
    return rows;
  }, [listPayload, urlMap]);

  const previewImages: PortfolioImage[] | undefined = useMemo(() => {
    const files = listPayload?.files ?? [];
    const imgs: PortfolioImage[] = [];
    for (const f of files) {
      if (inferMediaType(f.path) !== 'image') continue;
      const url = urlMap.get(f.path);
      if (!url) continue;
      imgs.push({ src: url, alt: f.name });
      if (imgs.length >= 12) break;
    }
    return imgs.length > 0 ? imgs : undefined;
  }, [listPayload, urlMap]);

  const portfolioFaceImages: PortfolioImage[] | undefined = useMemo(() => {
    const base = previewImages ?? [];
    const merged = [...launchImages, ...base];
    return merged.length > 0 ? merged : undefined;
  }, [previewImages, launchImages]);

  useEffect(() => {
    if (sourceTab !== 'google' || !googlePhotosReady) {
      queueMicrotask(() => {
        setGpItems([]);
        setGpNext(null);
      });
      return;
    }
    const payload = gpQ.data?.googlePhotosList as GooglePhotosListPayload | undefined;
    if (!payload || gpQ.loading) return;
    if (!payload.success) return;
    queueMicrotask(() => {
      setGpItems(mapGoogleMediaItems(payload.mediaItems));
      setGpNext(payload.nextPageToken ?? null);
    });
  }, [sourceTab, googlePhotosReady, gpQ.data, gpQ.loading]);

  const googlePreviewImages: PortfolioImage[] | undefined = useMemo(() => {
    const imgs: PortfolioImage[] = [];
    for (const it of gpItems) {
      if (it.type !== 'image') continue;
      imgs.push({ src: it.url, alt: it.title });
      if (imgs.length >= 12) break;
    }
    return imgs.length > 0 ? imgs : undefined;
  }, [gpItems]);

  const loadMoreGoogle = useCallback(async () => {
    if (!gpNext || !googleAccessToken || !googlePhotosReady || gpLoadingMore || !authed) return;
    setGpLoadingMore(true);
    try {
      const { data } = await client.query({
        query: GOOGLE_PHOTOS_LIST,
        variables: {
          params: { access_token: googleAccessToken, page_token: gpNext, page_size: 100 },
        },
        fetchPolicy: 'network-only',
      });
      const p = data?.googlePhotosList as GooglePhotosListPayload | undefined;
      if (p?.success) {
        setGpItems((prev) => [...prev, ...mapGoogleMediaItems(p.mediaItems)]);
        setGpNext(p.nextPageToken ?? null);
      }
    } finally {
      setGpLoadingMore(false);
    }
  }, [gpNext, googleAccessToken, googlePhotosReady, gpLoadingMore, authed, client]);

  const handleGoogleReauth = useCallback(async () => {
    if (!selectedGoogleUserId) return;
    setGoogleError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setGoogleError('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to your environment.');
      return;
    }
    const provider = new GoogleAuthProvider();
    configureGoogleLinkProvider(provider);
    setGoogleBusy(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (!accessToken) {
        setGoogleError('Google did not return an OAuth access token. Try again.');
        return;
      }
      const uid = result.user.uid;
      if (uid !== selectedGoogleUserId) {
        setGoogleError('Sign in with the same Google account that is selected above.');
        return;
      }
      const expiresAt = defaultGoogleOAuthExpiryEpoch();
      await refreshGoogleTokenMut({
        variables: {
          googleUserId: selectedGoogleUserId,
          accessToken,
          expiresAt,
          scopesGranted: GOOGLE_SCOPES_GRANTED_STRING,
        },
      });
      await tokenQ.refetch();
      setView('face');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Re-authentication failed.';
      setGoogleError(msg);
    } finally {
      setGoogleBusy(false);
    }
  }, [selectedGoogleUserId, refreshGoogleTokenMut, tokenQ]);

  const goToAccountsSettings = useCallback(() => {
    openApp('settings', { settingsTab: 'Accounts' });
  }, [openApp]);

  const listError = listQ.error;
  const gpError = gpQ.error;

  const tabBtn =
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border border-transparent';
  const tabActive = 'bg-white/15 text-white border-white/20';
  const tabIdle = 'text-slate-400 hover:bg-white/5 hover:text-slate-200';

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/95 text-slate-100">
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
        <div className="mx-auto flex max-w-4xl gap-2">
          <button
            type="button"
            className={`${tabBtn} ${sourceTab === 'workspace' ? tabActive : tabIdle}`}
            onClick={() => {
              setSourceTab('workspace');
              setView('face');
            }}
          >
            Workspace storage
          </button>
          <button
            type="button"
            className={`${tabBtn} ${sourceTab === 'google' ? tabActive : tabIdle}`}
            onClick={() => {
              setSourceTab('google');
              setView('face');
            }}
          >
            Google Photos
          </button>
        </div>
      </div>

      {sourceTab === 'workspace' ? (
        <>
          {view === 'face' ? (
            <div className="flex min-h-0 flex-1 flex-col p-2">
              {!authed ? (
                <p className="mx-auto mb-2 max-w-lg text-center text-xs text-slate-400">
                  Sign in to load images from your workspace storage. The preview below uses sample
                  artwork until you are signed in.
                </p>
              ) : null}
              {authed && listError ? (
                <p className="mx-auto mb-2 max-w-lg text-center text-xs text-red-300/90">
                  {listError.message}
                </p>
              ) : null}
              {authed && listQ.loading ? (
                <p className="mx-auto mb-2 text-center text-xs text-slate-500">Loading library…</p>
              ) : null}
              {authed && urlLoading && mediaPaths.length > 0 ? (
                <p className="mx-auto mb-2 text-center text-xs text-slate-500">
                  Resolving media URLs…
                </p>
              ) : null}
              <PortfolioGallery
                title="Gallery"
                primaryCta={{ text: 'Browse library' }}
                images={portfolioFaceImages}
                onPrimaryClick={() => setView('bento')}
                className="min-h-0 flex-1"
              />
            </div>
          ) : (
            <InteractiveBentoGallery
              onBack={() => setView('face')}
              mediaItems={workspaceMediaItems}
              title="Your library"
              description={
                authed
                  ? urlLoading
                    ? 'Resolving signed URLs…'
                    : 'From workspace storage · drag tiles to reorder'
                  : 'Sign in to connect storage-backed media'
              }
            />
          )}
        </>
      ) : (
        <>
          {!isFirebaseConfigured() ? (
            <p className="mx-auto mt-2 max-w-lg px-3 text-center text-xs text-amber-200/90">
              Set NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID to enable Google
              sign-in.
            </p>
          ) : null}
          {googleError ? (
            <p className="mx-auto mt-2 max-w-lg px-3 text-center text-xs text-red-300/90">
              {googleError}
            </p>
          ) : null}

          {!authed ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6">
              <p className="max-w-md text-center text-sm text-slate-400">
                Sign in to the desktop (email/password) to use linked Google accounts for Google
                Photos.
              </p>
            </div>
          ) : linkedQ.loading && linkedAccounts.length === 0 ? (
            <p className="mx-auto mt-6 text-center text-xs text-slate-500">
              Loading linked accounts…
            </p>
          ) : linkedAccounts.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
              <p className="max-w-md text-center text-sm text-slate-400">
                No Google accounts linked. Add one in Settings → Accounts (Photos read-only), then
                open Gallery again.
              </p>
              <button
                type="button"
                onClick={() => goToAccountsSettings()}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              >
                Go to Accounts settings
              </button>
            </div>
          ) : (
            <>
              <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                <span className="text-xs text-slate-500">Google account</span>
                <select
                  aria-label="Linked Google account for Photos"
                  title="Linked Google account"
                  className="max-w-xs rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100"
                  value={selectedGoogleUserId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedGoogleUserId(v || null);
                    setView('face');
                  }}
                >
                  {linkedAccounts.map((a) => (
                    <option key={a.googleUserId} value={a.googleUserId}>
                      {a.displayName?.trim() || a.email || a.googleUserId}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => goToAccountsSettings()}
                  className="ml-auto rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                >
                  Manage accounts
                </button>
              </div>

              {!googleAccessToken && tokenQ.loading ? (
                <p className="mx-auto mt-6 text-center text-xs text-slate-500">
                  Loading Google access…
                </p>
              ) : !googleAccessToken ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6">
                  <p className="max-w-md text-center text-sm text-slate-400">
                    Could not read a stored Google token for this account. Try Accounts settings or
                    Retry.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void tokenQ.refetch()}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs text-slate-100 hover:bg-white/10"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAccountsSettings()}
                      className="rounded-full bg-white px-4 py-2 text-xs font-medium text-slate-900 hover:bg-slate-100"
                    >
                      Open Accounts settings
                    </button>
                  </div>
                </div>
              ) : isGoogleAccessLikelyExpired(googleTokenExpiresAt) ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
                  <p className="max-w-md text-center text-sm text-slate-400">
                    Your Google Photos access token expired. Re-authenticate to continue browsing.
                  </p>
                  <button
                    type="button"
                    disabled={googleBusy || !isFirebaseConfigured()}
                    onClick={() => void handleGoogleReauth()}
                    className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {googleBusy ? 'Opening Google…' : 'Re-authenticate'}
                  </button>
                </div>
              ) : view === 'face' ? (
                <div className="flex min-h-0 flex-1 flex-col p-2">
                  <div className="mx-auto mb-2 max-w-4xl px-1">
                    <p className="text-xs text-slate-500">
                      Using linked account · URLs expire (~60m); use Re-authenticate in Settings if
                      previews break.
                    </p>
                  </div>
                  {authed && gpQ.loading ? (
                    <p className="mx-auto mb-2 text-center text-xs text-slate-500">
                      Loading Google Photos…
                    </p>
                  ) : null}
                  {authed && gpError ? (
                    <p className="mx-auto mb-2 max-w-lg text-center text-xs text-red-300/90">
                      {gpError.message}
                    </p>
                  ) : null}
                  <PortfolioGallery
                    title="Google Photos"
                    primaryCta={{ text: 'Browse library' }}
                    images={googlePreviewImages}
                    onPrimaryClick={() => setView('bento')}
                    className="min-h-0 flex-1"
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="mx-auto flex w-full max-w-4xl shrink-0 items-center justify-end gap-2 px-3 py-2">
                    {gpNext ? (
                      <button
                        type="button"
                        disabled={gpLoadingMore}
                        onClick={() => void loadMoreGoogle()}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
                      >
                        {gpLoadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    ) : null}
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <InteractiveBentoGallery
                      onBack={() => setView('face')}
                      mediaItems={gpItems}
                      title="Google Photos"
                      description="From Google Photos Library API · drag tiles to reorder (local only)"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
