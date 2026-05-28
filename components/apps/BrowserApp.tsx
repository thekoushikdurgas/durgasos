'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Home,
  Loader2,
  Plus,
  RotateCw,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { swallowClientError, swallowStorageError } from '@/lib/safe-client-storage';
import { useWindowLaunch } from '@/components/window-launch-context';
import { useGoogleDriveLaunchSource } from '@/hooks/use-google-drive-launch-source';
import { STORAGE_GET_URL } from '@/lib/graphql-modules';
import { rewriteStorageHtmlAssets } from '@/lib/storage-html-asset-rewrite';

type StorageUrlPayload = { success?: boolean; url?: string };

const BOOKMARKS_KEY = 'durgasos.browser.bookmarks.v1';

type BrowserTab = {
  id: string;
  title: string;
  /** `about:start` or `https://...` */
  url: string;
};

function tabId() {
  return `bt-${Math.random().toString(36).slice(2, 9)}`;
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function urlProtocol(s: string): string {
  try {
    return new URL(s).protocol;
  } catch {
    return '(invalid)';
  }
}

function isBlobUrl(s: string): boolean {
  return urlProtocol(s) === 'blob:';
}

function defaultSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `https://duckduckgo.com/?q=${q}`;
}

/**
 * Many sites refuse to render inside cross-origin iframes (X-Frame-Options / CSP
 * frame-ancestors). The iframe still "loads" but appears blank/black — `onError`
 * does not fire. We show a fallback instead of an empty viewport.
 *
 * Verified (HTTP HEAD, 2026-05-16): duckduckgo.com and bing.com send
 * `X-Frame-Options: SAMEORIGIN`; google.com uses strict frame-ancestors.
 */
function isLikelyFrameBlocked(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === 'google.com' || host.endsWith('.google.com')) return true;
  if (host === 'duckduckgo.com' || host.endsWith('.duckduckgo.com')) return true;
  if (host === 'bing.com' || host.endsWith('.bing.com')) return true;
  const blocked = [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'netflix.com',
  ];
  for (const d of blocked) {
    if (host === d || host.endsWith(`.${d}`)) return true;
  }
  return false;
}

export function BrowserApp() {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [
    { id: tabId(), title: 'Start', url: 'about:start' },
  ]);
  const [activeId, setActiveId] = useState(() => tabs[0]!.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]!;

  const [address, setAddress] = useState('');
  const [searchBox, setSearchBox] = useState('');
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [iframeNonce, setIframeNonce] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (raw) return JSON.parse(raw) as string[];
    } catch (err) {
      swallowStorageError('browser-app.loadBookmarks', err);
    }
    return [];
  });

  const persistBookmarks = useCallback((next: string[]) => {
    setBookmarks(next);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  }, []);

  const activeIsStart = active.url === 'about:start';
  const activeIsHttp = isHttpUrl(active.url);
  const frameBlocked = activeIsHttp && !activeIsStart && isLikelyFrameBlocked(active.url);
  /** `blob:` (e.g. storage HTML/PDF) must use the iframe path; `isHttpUrl` is false for blob URLs. */
  const canEmbedPage = !activeIsStart && (activeIsHttp || isBlobUrl(active.url));

  // #region agent log
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const proto = urlProtocol(active.url);
    const branch = activeIsStart
      ? 'start'
      : canEmbedPage && frameBlocked
        ? 'frameBlocked'
        : canEmbedPage
          ? 'iframe'
          : 'unsupported-other';
    fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af5693' },
      body: JSON.stringify({
        sessionId: 'af5693',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'BrowserApp.tsx:active-branch',
        message: 'browser active tab render branch probe',
        data: {
          proto,
          activeIsHttp,
          canEmbedPage,
          frameBlocked,
          branch,
          urlSample: active.url.slice(0, 120),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [active.url, activeIsStart, activeIsHttp, canEmbedPage, frameBlocked]);
  // #endregion

  useEffect(() => {
    queueMicrotask(() => {
      setAddress(active.url === 'about:start' ? '' : active.url);
      setIframeError(null);
      setIframeNonce((n) => n + 1);
    });
  }, [active.id, active.url]);

  const go = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      let nextUrl = t;
      if (!t.includes('://') && !t.startsWith('about:')) {
        if (t.includes('.') && !t.includes(' ')) {
          nextUrl = t.startsWith('http') ? t : `https://${t}`;
        } else {
          nextUrl = defaultSearchUrl(t);
        }
      }
      setTabs((prev) =>
        prev.map((x) => (x.id === activeId ? { ...x, url: nextUrl, title: nextUrl } : x))
      );
    },
    [activeId]
  );

  const launch = useWindowLaunch();
  const driveSrc = useGoogleDriveLaunchSource(launch);
  const launchAppliedRef = useRef(false);
  const [getUrl] = useMutation(STORAGE_GET_URL);

  useEffect(() => {
    if (launchAppliedRef.current || !launch) return;
    if (driveSrc.objectUrl && launch.fileName?.match(/\.pdf$/i)) {
      launchAppliedRef.current = true;
      const id = activeId;
      const title = launch.fileName ?? 'PDF';
      queueMicrotask(() => {
        setTabs((prev) =>
          prev.map((x) => (x.id === id ? { ...x, url: driveSrc.objectUrl!, title } : x))
        );
      });
      return;
    }
    if (launch.initialUrl) {
      launchAppliedRef.current = true;
      const url = launch.initialUrl;
      queueMicrotask(() => {
        go(url);
      });
      return;
    }
    const s = launch.storage;
    if (s?.file_path && launch.fileName?.match(/\.pdf$/i)) {
      launchAppliedRef.current = true;
      const id = activeId;
      const title = launch.fileName ?? 'PDF';
      void (async () => {
        try {
          const { data } = await getUrl({
            variables: { params: { bucket_type: s.bucket_type, file_path: s.file_path } },
          });
          const json = data?.storageGetUrl as StorageUrlPayload | undefined;
          const signed = json?.success && json.url ? json.url : null;
          if (!signed) return;
          const res = await fetch(signed);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          queueMicrotask(() => {
            setTabs((prev) => prev.map((x) => (x.id === id ? { ...x, url: blobUrl, title } : x)));
          });
        } catch (err) {
          swallowClientError('browser-app.fetchSignedHtml', err);
        }
      })();
      return;
    }
    if (s?.file_path && launch.fileName?.match(/\.html?$/i)) {
      launchAppliedRef.current = true;
      const id = activeId;
      const title = launch.fileName ?? 'HTML';
      void (async () => {
        try {
          const { data } = await getUrl({
            variables: { params: { bucket_type: s.bucket_type, file_path: s.file_path } },
          });
          const json = data?.storageGetUrl as StorageUrlPayload | undefined;
          const signed = json?.success && json.url ? json.url : null;
          if (!signed) return;
          const res = await fetch(signed);
          const htmlText = await res.text();
          const getSignedUrlForPath = async (filePath: string) => {
            const { data } = await getUrl({
              variables: { params: { bucket_type: s.bucket_type, file_path: filePath } },
            });
            const j = data?.storageGetUrl as StorageUrlPayload | undefined;
            return j?.success && j.url ? j.url : null;
          };
          const { html, stats } = await rewriteStorageHtmlAssets({
            htmlText,
            htmlStoragePath: s.file_path,
            getSignedUrlForPath,
          });
          const displayBlob = new Blob([html], { type: 'text/html; charset=utf-8' });
          const blobUrl = URL.createObjectURL(displayBlob);
          // #region agent log
          fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af5693' },
            body: JSON.stringify({
              sessionId: 'af5693',
              runId: 'post-fix',
              hypothesisId: 'H3',
              location: 'BrowserApp.tsx:html-storage-rewrite',
              message: 'HTML storage asset rewrite',
              data: {
                htmlPathSample: s.file_path.slice(-80),
                storagePaths: stats.storagePaths,
                signedOk: stats.signedOk,
                attributesUpdated: stats.attributesUpdated,
                styleBlocksUpdated: stats.styleBlocksUpdated,
                stylesheetsInlined: stats.stylesheetsInlined,
                scriptsMaterialized: stats.scriptsMaterialized,
                blobUrlProto: urlProtocol(blobUrl),
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          queueMicrotask(() => {
            setTabs((prev) => prev.map((x) => (x.id === id ? { ...x, url: blobUrl, title } : x)));
          });
        } catch {
          // #region agent log
          fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af5693' },
            body: JSON.stringify({
              sessionId: 'af5693',
              runId: 'post-fix',
              hypothesisId: 'H4',
              location: 'BrowserApp.tsx:html-storage-catch',
              message: 'HTML storage load failed',
              data: {},
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          queueMicrotask(() => {
            setTabs((prev) =>
              prev.map((x) => (x.id === id ? { ...x, url: 'https://example.com', title } : x))
            );
          });
        }
      })();
      return;
    }
    if (launch.fileName?.match(/\.html?$/i)) {
      launchAppliedRef.current = true;
      const id = activeId;
      const title = launch.fileName ?? 'HTML';
      queueMicrotask(() => {
        setTabs((prev) =>
          prev.map((x) => (x.id === id ? { ...x, url: 'https://example.com', title } : x))
        );
      });
    }
  }, [launch, go, activeId, getUrl, driveSrc.objectUrl]);

  const newTab = useCallback(() => {
    const id = tabId();
    setTabs((prev) => [...prev, { id, title: 'Start', url: 'about:start' }]);
    setActiveId(id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeId) {
          const neighbor = prev[idx - 1] ?? prev[idx + 1];
          if (neighbor) setActiveId(neighbor.id);
        }
        return next;
      });
    },
    [activeId]
  );

  const bookmarkCurrent = useCallback(() => {
    if (!activeIsHttp) return;
    if (bookmarks.includes(active.url)) return;
    persistBookmarks([...bookmarks, active.url]);
  }, [active.url, activeIsHttp, bookmarks, persistBookmarks]);

  const historyBack = useCallback(() => {
    /* stub: would sync iframe history */
  }, []);

  const historyForward = useCallback(() => {
    /* stub */
  }, []);

  const tileClass =
    'flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80 hover:bg-white/10';

  const startBody = useMemo(
    () => (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto p-6">
        <div className="flex items-center gap-3 text-white/90">
          <Globe className="h-12 w-12 text-indigo-400" strokeWidth={1.25} />
          <div>
            <p className="text-lg font-semibold">Durgas Browser</p>
            <p className="text-xs text-white/50">Enter a URL or search below</p>
          </div>
        </div>
        <div className="flex w-full max-w-md gap-2">
          <Input
            placeholder="Search the web…"
            value={searchBox}
            onChange={(e) => setSearchBox(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchBox.trim()) go(defaultSearchUrl(searchBox));
            }}
            className="border-white/10 bg-black/30 text-white"
          />
          <button
            type="button"
            className="rounded-lg bg-indigo-600/80 px-4 py-2 text-sm text-white hover:bg-indigo-600"
            onClick={() => searchBox.trim() && go(defaultSearchUrl(searchBox))}
          >
            Go
          </button>
        </div>
        <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
          <button type="button" className={tileClass} onClick={() => go('https://example.com')}>
            <Globe className="h-6 w-6" />
            Example.com
          </button>
          <button type="button" className={tileClass} onClick={() => go('https://wikipedia.org')}>
            <Globe className="h-6 w-6" />
            Wikipedia
          </button>
          <button type="button" className={tileClass} onClick={() => go('https://duckduckgo.com')}>
            <Search className="h-6 w-6" />
            DuckDuckGo
          </button>
        </div>
        {bookmarks.length > 0 ? (
          <div className="w-full max-w-lg">
            <p className="mb-2 text-[10px] font-bold uppercase text-white/40">Bookmarks</p>
            <div className="flex flex-wrap gap-2">
              {bookmarks.map((b) => (
                <button
                  key={b}
                  type="button"
                  className="truncate rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-blue-300 hover:bg-white/10"
                  onClick={() => go(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    ),
    [bookmarks, go, searchBox]
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/10 px-1">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={cn(
              'group flex max-w-[10rem] items-center rounded-t border border-b-0 px-2 py-1 text-[11px]',
              t.id === activeId ? 'border-white/15 bg-white/10' : 'border-transparent opacity-70'
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left"
              onClick={() => setActiveId(t.id)}
            >
              {t.title}
            </button>
            {tabs.length > 1 ? (
              <button
                type="button"
                className="ml-1 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Close tab"
                onClick={() => closeTab(t.id)}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="ml-1 rounded p-1 text-white/50 hover:bg-white/10"
          aria-label="New tab"
          onClick={newTab}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-2">
        <button
          type="button"
          title="Back"
          className="rounded p-1.5 text-white/60 hover:bg-white/10"
          onClick={historyBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Forward"
          className="rounded p-1.5 text-white/60 hover:bg-white/10"
          onClick={historyForward}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Reload"
          className="rounded p-1.5 text-white/60 hover:bg-white/10"
          onClick={() => {
            setIframeError(null);
            setIframeNonce((n) => n + 1);
          }}
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Home"
          className="rounded p-1.5 text-white/60 hover:bg-white/10"
          onClick={() => {
            setTabs((prev) =>
              prev.map((x) =>
                x.id === activeId ? { ...x, url: 'about:start', title: 'Start' } : x
              )
            );
          }}
        >
          <Home className="h-4 w-4" />
        </button>
        <Input
          className="mx-1 min-w-0 flex-1 border-white/10 bg-black/30 py-1 text-xs text-white"
          placeholder="Search or enter address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go(address);
          }}
        />
        <button
          type="button"
          title="Bookmark"
          className={cn(
            'rounded p-1.5 hover:bg-white/10',
            activeIsHttp ? 'text-amber-300' : 'text-white/25'
          )}
          disabled={!activeIsHttp}
          onClick={bookmarkCurrent}
        >
          <Star className="h-4 w-4" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-black/40">
        {activeIsStart ? (
          startBody
        ) : canEmbedPage ? (
          frameBlocked ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-black/50 p-6 text-center">
              <Globe className="h-10 w-10 text-white/30" strokeWidth={1.25} />
              <div className="max-w-md space-y-2 text-sm text-white/80">
                <p className="font-medium text-white">
                  This site cannot be shown inside the in-app browser
                </p>
                <p className="text-xs text-white/55">
                  Major sites (Google, DuckDuckGo, Bing, many social networks) send{' '}
                  <code className="rounded bg-white/10 px-1">X-Frame-Options: SAMEORIGIN</code> or{' '}
                  <code className="rounded bg-white/10 px-1">
                    Content-Security-Policy: frame-ancestors
                  </code>{' '}
                  so they cannot render inside the embedded iframe here. The area looks empty or
                  black — that is expected, not a broken network connection.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
                  onClick={() => window.open(active.url, '_blank', 'noopener,noreferrer')}
                >
                  Open in new tab
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
                  onClick={() => go(defaultSearchUrl(new URL(active.url).hostname))}
                >
                  Search this host on DuckDuckGo
                </button>
              </div>
            </div>
          ) : (
            <>
              <iframe
                key={`${active.url}-${iframeNonce}`}
                title={active.title}
                src={active.url}
                className="h-full w-full border-0"
                onError={() => setIframeError('Could not load page (blocked or network).')}
              />
              {iframeError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-sm text-amber-200">
                  {iframeError}
                </div>
              ) : null}
            </>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-white/50">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Unsupported URL scheme (demo)
          </div>
        )}
      </div>
    </div>
  );
}
