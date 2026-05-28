'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Brain,
  ChevronDown,
  Download,
  File,
  Folder,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Monitor,
  Music,
  Film,
  Laptop,
  Plus,
  RotateCw,
  FolderPlus,
  FolderUp,
  Search,
  Sparkles,
  Table2,
  Tag,
  Trash2,
  Upload,
  Globe,
  X,
  PanelLeft,
} from 'lucide-react';
import { FileTagChips } from '@/components/apps/FileTagChips';
import { useFileTags } from '@/hooks/use-file-tags';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { swallowClientError } from '@/lib/safe-client-storage';
import type {
  FsIconKey,
  MockFsEntry,
  NavHistory,
  PathSegments,
  SearchHit,
} from '@/lib/file-explorer-mock';
import {
  back,
  defaultTabLabel,
  enumerateFilesUnder,
  formatPathDisplay,
  forward,
  globMatchesFileName,
  goTo,
  initialHistory,
  listDirectory,
  parentPath,
  parseAddressInput,
  pathExists,
  pathKey,
  isUserStoragePath,
  isGoogleDrivePath,
} from '@/lib/file-explorer-mock';
import { FolderTree } from '@/components/apps/FolderTree';
import {
  FileExplorerUploadPanel,
  type UploadRowPatch,
} from '@/components/apps/FileExplorerUploadPanel';
import { useOS } from '@/components/os-context';
import { useInstalledApps } from '@/hooks/use-installed-apps';
import type { AppId } from '@/lib/apps';
import { APPS } from '@/lib/apps';
import {
  extensionFromFileName,
  getAppsSupportingExtension,
  resolveDefaultApp,
  appSupportsExtension,
} from '@/lib/app-file-associations';
import {
  mapStorageRowToExplorerEntry,
  storageListParamsForPath,
  storageFolderPathFromExplorerPath,
  STORAGE_BUCKET_UPLOADS,
  joinStorageUploadRelativePath,
  fileToBase64ForUpload,
  coerceStorageListPayload,
  type ExplorerEntry,
  type StorageListPayload,
} from '@/lib/file-explorer-storage';
import { uploadFileInChunks } from '@/lib/chunked-upload';
import { readStoredAuthTokens } from '@/lib/auth-tokens-local';
import {
  ME,
  STORAGE_LIST,
  STORAGE_DELETE,
  STORAGE_MOVE,
  STORAGE_MKDIR,
  STORAGE_UPLOAD,
  LINKED_GOOGLE_ACCOUNTS,
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
  GOOGLE_DRIVE_LIST_FILES,
} from '@/lib/graphql-modules';
import {
  buildDriveListParams,
  coerceGoogleDriveListPayload,
  driveListQueryForExplorerPath,
  isGoogleDriveAccountPickerPath,
  isGoogleDriveFolderListPath,
  linkedAccountToExplorerEntry,
  mapDriveFileToExplorerEntry,
  parseGoogleDriveUserId,
} from '@/lib/file-explorer-google-drive';
import { shouldOpenGoogleDriveInBrowser } from '@/lib/google-drive-media';
import { galleryImageLaunchExtras } from '@/lib/gallery-launch';
import { parseLinkedGoogleAccounts } from '@/lib/linked-google-accounts';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';
import type { LaunchPayload } from '@/lib/window-launch';

type ViewMode = 'grid' | 'list' | 'details';
type ExplorerMode = 'browse' | 'search';

type ExplorerTab = {
  id: string;
  history: NavHistory;
};

type SortKey = 'name' | 'size' | 'type' | 'modified';

function replaceStorageFileName(fullPath: string, newFileName: string): string {
  const i = fullPath.lastIndexOf('/');
  if (i < 0) return newFileName;
  return `${fullPath.slice(0, i + 1)}${newFileName}`;
}

function sanitizeNewFolderName(raw: string): string | null {
  const t = raw.trim().replace(/\\/g, '/');
  if (!t) return null;
  for (const seg of t.split('/')) {
    if (!seg || seg === '.' || seg === '..') return null;
  }
  if (t.includes('..')) return null;
  return t;
}

function relativeSegmentsUnderMyStorage(fullPath: PathSegments): string[] {
  if (!isUserStoragePath(fullPath)) return [];
  return fullPath.slice(2) as string[];
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

const ICONS: Record<
  FsIconKey,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  folder: Folder,
  file: File,
  download: Download,
  image: ImageIcon,
  drive: HardDrive,
  music: Music,
  video: Film,
  trash: Trash2,
  network: Globe,
  desktop: Monitor,
  pc: Laptop,
};

const COLOR_BY_ICON: Partial<Record<FsIconKey, string>> = {
  folder: 'text-blue-400',
  file: 'text-yellow-400',
  download: 'text-emerald-400',
  image: 'text-purple-400',
  drive: 'text-gray-400',
  music: 'text-pink-400',
  video: 'text-orange-400',
  trash: 'text-slate-400',
  network: 'text-cyan-400',
  desktop: 'text-sky-400',
  pc: 'text-indigo-400',
};

const QUICK_ACCESS: { label: string; path: PathSegments }[] = [
  { label: 'Home', path: ['This PC'] },
  { label: 'Desktop', path: ['This PC', 'Desktop'] },
  { label: 'Documents', path: ['This PC', 'Documents'] },
  { label: 'Downloads', path: ['This PC', 'Downloads'] },
  { label: 'Pictures', path: ['This PC', 'Pictures'] },
  { label: 'Music', path: ['This PC', 'Music'] },
  { label: 'Videos', path: ['This PC', 'Videos'] },
];

const THIS_PC_PLACES: { label: string; path: PathSegments }[] = [
  { label: 'Google Drive', path: ['This PC', 'Google Drive'] },
  { label: 'Local Disk (C:)', path: ['This PC', 'Local Disk (C:)'] },
  { label: 'Data (D:)', path: ['This PC', 'Data (D:)'] },
];

const NETWORK_PLACES: { label: string; path: PathSegments }[] = [
  { label: 'localhost', path: ['Network', 'localhost'] },
];

const SEARCH_SCOPES: { label: string; path: PathSegments }[] = [
  { label: 'This PC', path: ['This PC'] },
  { label: 'My Storage (current folder only)', path: ['This PC', 'My Storage'] },
  { label: 'Documents', path: ['This PC', 'Documents'] },
  { label: 'Downloads', path: ['This PC', 'Downloads'] },
  { label: 'Local Disk (C:)', path: ['This PC', 'Local Disk (C:)'] },
  { label: 'Network', path: ['Network'] },
];

function newTabId(): string {
  return `fe-tab-${Math.random().toString(36).slice(2, 10)}`;
}

function pathsEqual(a: PathSegments, b: PathSegments): boolean {
  return pathKey(a) === pathKey(b);
}

function formatBytes(n?: number): string {
  if (n == null) return '—';
  if (n === 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

function formatModified(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function folderKindLabel(segments: PathSegments): string {
  if (isUserStoragePath(segments)) return 'Cloud storage';
  if (isGoogleDrivePath(segments)) return 'Google Drive';
  if (segments[0] === 'Network') return 'Network location';
  if (segments[0] === 'Recycle Bin') return 'Recycle Bin';
  if (segments.length === 1 && segments[0] === 'This PC') return 'Virtual folder';
  if (segments[1]?.includes('Disk')) return 'Local disk';
  return 'Folder';
}

function EntryIcon({ entry }: { entry: ExplorerEntry }) {
  const Icon = ICONS[entry.icon];
  return (
    <Icon
      className={cn('shrink-0', COLOR_BY_ICON[entry.icon] ?? 'text-white/80')}
      strokeWidth={1.5}
    />
  );
}

export function FileExplorerApp() {
  const { openApp } = useOS();
  const { installedIds, fileAssociations } = useInstalledApps();
  const meQ = useQuery(ME);
  const userSub = meQ.data?.me?.id;
  const authed = Boolean(userSub);
  const reducedMotion = usePrefersReducedMotion();
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>('browse');
  const [showFolderTree, setShowFolderTree] = useState(false);
  const { getFileTags, addTag, removeTag } = useFileTags();

  const [searchNamePattern, setSearchNamePattern] = useState('*.txt');
  const [searchPhrase, setSearchPhrase] = useState('');
  const [searchScope, setSearchScope] = useState<PathSegments>(['This PC']);
  const [searchIncludeHidden, setSearchIncludeHidden] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchRan, setSearchRan] = useState(false);

  const [tabs, setTabs] = useState<ExplorerTab[]>(() => [
    { id: newTabId(), history: initialHistory() },
  ]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]!.id);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;
  const history = activeTab.history;

  const displayPath = formatPathDisplay(history.current);
  const [addressFocused, setAddressFocused] = useState(false);
  const [addressDraft, setAddressDraft] = useState(displayPath);
  const addressInputValue = addressFocused ? addressDraft : displayPath;

  const [addressError, setAddressError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [dualPane, setDualPane] = useState(false);
  const [activePane, setActivePane] = useState<'left' | 'right'>('left');
  const [rightHistory, setRightHistory] = useState<NavHistory>(() =>
    initialHistory(['This PC', 'Documents'])
  );

  const leftPath = history.current;
  const rightPath = rightHistory.current;

  const toolbarStoragePath = useMemo<PathSegments>(
    () => (dualPane && activePane === 'right' ? rightPath : leftPath),
    [dualPane, activePane, rightPath, leftPath]
  );
  const toolbarInCloud = isUserStoragePath(toolbarStoragePath) && authed;

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [driveRefreshNonce, setDriveRefreshNonce] = useState(0);

  const linkedGoogleQ = useQuery(LINKED_GOOGLE_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });
  const linkedGoogleAccounts = useMemo(
    () => parseLinkedGoogleAccounts(linkedGoogleQ.data?.linkedGoogleAccounts),
    [linkedGoogleQ.data?.linkedGoogleAccounts]
  );

  const leftDriveUid = useMemo(() => parseGoogleDriveUserId(leftPath), [leftPath]);
  const rightDriveUid = useMemo(() => parseGoogleDriveUserId(rightPath), [rightPath]);

  const leftDriveTokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || !leftDriveUid,
    variables: { googleUserId: leftDriveUid ?? '' },
    fetchPolicy: 'cache-and-network',
  });
  const rightDriveTokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || !rightDriveUid,
    variables: { googleUserId: rightDriveUid ?? '' },
    fetchPolicy: 'cache-and-network',
  });

  const leftDriveAccessToken = useMemo(
    () => readGoogleTokenPayload(leftDriveTokenQ.data?.getLinkedGoogleAccountToken).accessToken,
    [leftDriveTokenQ.data?.getLinkedGoogleAccountToken]
  );
  const rightDriveAccessToken = useMemo(
    () => readGoogleTokenPayload(rightDriveTokenQ.data?.getLinkedGoogleAccountToken).accessToken,
    [rightDriveTokenQ.data?.getLinkedGoogleAccountToken]
  );

  const [runLeftDriveList] = useLazyQuery(GOOGLE_DRIVE_LIST_FILES, { fetchPolicy: 'network-only' });
  const [runRightDriveList] = useLazyQuery(GOOGLE_DRIVE_LIST_FILES, {
    fetchPolicy: 'network-only',
  });

  type DrivePaneList = { pathKey: string; items: ExplorerEntry[]; nextToken: string | null };
  const emptyDrivePane = (): DrivePaneList => ({ pathKey: '', items: [], nextToken: null });

  const [leftDriveList, setLeftDriveList] = useState<DrivePaneList>(emptyDrivePane);
  const [rightDriveList, setRightDriveList] = useState<DrivePaneList>(emptyDrivePane);
  const [leftDriveLoading, setLeftDriveLoading] = useState(false);
  const [rightDriveLoading, setRightDriveLoading] = useState(false);
  const [leftDriveLoadingMore, setLeftDriveLoadingMore] = useState(false);
  const [rightDriveLoadingMore, setRightDriveLoadingMore] = useState(false);

  const leftStorageParams = useMemo(
    () => storageListParamsForPath(leftPath, userSub),
    [leftPath, userSub]
  );
  const storageLeftQ = useQuery(STORAGE_LIST, {
    skip: leftStorageParams == null,
    variables: { params: leftStorageParams ?? {} },
    fetchPolicy: 'network-only',
  });
  const {
    data: storageLeftData,
    error: storageLeftError,
    loading: storageLeftLoading,
    refetch: refetchStorageLeft,
  } = storageLeftQ;

  const rightStorageParams = useMemo(
    () => storageListParamsForPath(rightPath, userSub),
    [rightPath, userSub]
  );
  const storageRightQ = useQuery(STORAGE_LIST, {
    skip: rightStorageParams == null,
    variables: { params: rightStorageParams ?? {} },
    fetchPolicy: 'network-only',
  });
  const { refetch: refetchStorageRight, data: storageRightData } = storageRightQ;

  const [storageDeleteMut] = useMutation(STORAGE_DELETE);
  const [storageMoveMut] = useMutation(STORAGE_MOVE);
  const [storageMkdirMut] = useMutation(STORAGE_MKDIR);
  const [storageUploadMut] = useMutation(STORAGE_UPLOAD);

  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [uploadPanelBaseSegments, setUploadPanelBaseSegments] = useState<string[]>([]);
  const uploadQueueChainRef = useRef(Promise.resolve());
  const [leftCloudStaleEntries, setLeftCloudStaleEntries] = useState<{
    pathKey: string;
    entries: ExplorerEntry[];
  }>({ pathKey: '', entries: [] });
  const [rightCloudStaleEntries, setRightCloudStaleEntries] = useState<{
    pathKey: string;
    entries: ExplorerEntry[];
  }>({ pathKey: '', entries: [] });

  const uploadDestinationLabel = useMemo(
    () => formatPathDisplay(['This PC', 'My Storage', ...uploadPanelBaseSegments] as PathSegments),
    [uploadPanelBaseSegments]
  );

  useEffect(() => {
    if (!toolbarInCloud) {
      queueMicrotask(() => {
        setUploadPanelOpen(false);
      });
    }
  }, [toolbarInCloud]);

  const openUploadPanel = useCallback((segments: string[]) => {
    setUploadPanelBaseSegments(segments);
    setUploadPanelOpen(true);
  }, []);

  const bumpAndRefetchStorage = useCallback(async () => {
    setRefreshNonce((n) => n + 1);
    try {
      const leftP =
        leftStorageParams != null
          ? refetchStorageLeft({ params: leftStorageParams })
          : Promise.resolve(null);
      const rightP =
        rightStorageParams != null
          ? refetchStorageRight({ params: rightStorageParams })
          : Promise.resolve(null);
      await Promise.all([leftP, rightP]);
    } catch (e) {
      console.error('Storage list refetch failed', e);
    }
  }, [
    leftStorageParams,
    rightStorageParams,
    setRefreshNonce,
    refetchStorageLeft,
    refetchStorageRight,
  ]);

  const leftDrivePathKey = useMemo(
    () => (isGoogleDriveFolderListPath(leftPath) ? pathKey(leftPath) : ''),
    [leftPath]
  );
  const rightDrivePathKey = useMemo(
    () => (isGoogleDriveFolderListPath(rightPath) ? pathKey(rightPath) : ''),
    [rightPath]
  );
  const leftDriveListQ = useMemo(() => driveListQueryForExplorerPath(leftPath), [leftPath]);
  const rightDriveListQ = useMemo(() => driveListQueryForExplorerPath(rightPath), [rightPath]);

  const drivePathLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const a of linkedGoogleAccounts) {
      labels[a.googleUserId] = a.displayName?.trim() || a.email || a.googleUserId;
    }
    for (const e of [...leftDriveList.items, ...rightDriveList.items]) {
      if (e.explorerPathSegment) labels[e.explorerPathSegment] = e.name;
      if (e.googleDrive?.fileId) labels[e.googleDrive.fileId] = e.name;
    }
    return labels;
  }, [linkedGoogleAccounts, leftDriveList.items, rightDriveList.items]);

  useEffect(() => {
    if (!isGoogleDriveFolderListPath(leftPath)) return;
    if (leftDriveListQ == null) return;
    if (!leftDriveAccessToken) return;
    const pk = leftDrivePathKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLeftDriveLoading(true);
      void runLeftDriveList({
        variables: {
          params: buildDriveListParams({
            accessToken: leftDriveAccessToken,
            q: leftDriveListQ,
          }),
        },
      })
        .then((res) => {
          if (cancelled) return;
          const p = coerceGoogleDriveListPayload(res.data?.googleDriveListFiles);
          const files = p?.files ?? [];
          setLeftDriveList({
            pathKey: pk,
            items: files.map(mapDriveFileToExplorerEntry),
            nextToken: p?.nextPageToken ?? null,
          });
        })
        .catch(() => {
          if (!cancelled) setLeftDriveList({ pathKey: pk, items: [], nextToken: null });
        })
        .finally(() => {
          if (!cancelled) setLeftDriveLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [
    leftPath,
    leftDrivePathKey,
    leftDriveListQ,
    leftDriveAccessToken,
    driveRefreshNonce,
    runLeftDriveList,
  ]);

  useEffect(() => {
    if (!isGoogleDriveFolderListPath(rightPath)) return;
    if (rightDriveListQ == null) return;
    if (!rightDriveAccessToken) return;
    const pk = rightDrivePathKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRightDriveLoading(true);
      void runRightDriveList({
        variables: {
          params: buildDriveListParams({
            accessToken: rightDriveAccessToken,
            q: rightDriveListQ,
          }),
        },
      })
        .then((res) => {
          if (cancelled) return;
          const p = coerceGoogleDriveListPayload(res.data?.googleDriveListFiles);
          const files = p?.files ?? [];
          setRightDriveList({
            pathKey: pk,
            items: files.map(mapDriveFileToExplorerEntry),
            nextToken: p?.nextPageToken ?? null,
          });
        })
        .catch(() => {
          if (!cancelled) setRightDriveList({ pathKey: pk, items: [], nextToken: null });
        })
        .finally(() => {
          if (!cancelled) setRightDriveLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [
    rightPath,
    rightDrivePathKey,
    rightDriveListQ,
    rightDriveAccessToken,
    driveRefreshNonce,
    runRightDriveList,
  ]);

  const loadMoreLeftDrive = useCallback(async () => {
    if (!leftDriveList.nextToken || !leftDriveAccessToken || leftDriveListQ == null) return;
    if (leftDriveList.pathKey !== leftDrivePathKey) return;
    setLeftDriveLoadingMore(true);
    try {
      const res = await runLeftDriveList({
        variables: {
          params: buildDriveListParams({
            accessToken: leftDriveAccessToken,
            q: leftDriveListQ,
            pageToken: leftDriveList.nextToken,
          }),
        },
      });
      const p = coerceGoogleDriveListPayload(res.data?.googleDriveListFiles);
      const add = (p?.files ?? []).map(mapDriveFileToExplorerEntry);
      setLeftDriveList((s) =>
        s.pathKey === leftDrivePathKey
          ? { ...s, items: [...s.items, ...add], nextToken: p?.nextPageToken ?? null }
          : s
      );
    } catch (err) {
      swallowClientError('file-explorer.driveLoadMore.left', err);
    } finally {
      setLeftDriveLoadingMore(false);
    }
  }, [
    leftDriveList.nextToken,
    leftDriveList.pathKey,
    leftDriveAccessToken,
    leftDriveListQ,
    leftDrivePathKey,
    runLeftDriveList,
  ]);

  const loadMoreRightDrive = useCallback(async () => {
    if (!rightDriveList.nextToken || !rightDriveAccessToken || rightDriveListQ == null) return;
    if (rightDriveList.pathKey !== rightDrivePathKey) return;
    setRightDriveLoadingMore(true);
    try {
      const res = await runRightDriveList({
        variables: {
          params: buildDriveListParams({
            accessToken: rightDriveAccessToken,
            q: rightDriveListQ,
            pageToken: rightDriveList.nextToken,
          }),
        },
      });
      const p = coerceGoogleDriveListPayload(res.data?.googleDriveListFiles);
      const add = (p?.files ?? []).map(mapDriveFileToExplorerEntry);
      setRightDriveList((s) =>
        s.pathKey === rightDrivePathKey
          ? { ...s, items: [...s.items, ...add], nextToken: p?.nextPageToken ?? null }
          : s
      );
    } catch (err) {
      swallowClientError('file-explorer.driveLoadMore.right', err);
    } finally {
      setRightDriveLoadingMore(false);
    }
  }, [
    rightDriveList.nextToken,
    rightDriveList.pathKey,
    rightDriveAccessToken,
    rightDriveListQ,
    rightDrivePathKey,
    runRightDriveList,
  ]);

  const onToolbarRefresh = useCallback(() => {
    setDriveRefreshNonce((n) => n + 1);
    void bumpAndRefetchStorage();
  }, [bumpAndRefetchStorage]);

  const defaultCloudNavRef = useRef(false);
  useEffect(() => {
    if (!authed || defaultCloudNavRef.current) return;
    defaultCloudNavRef.current = true;
    setTabs((prev) =>
      prev.map((t, i) => {
        if (i !== 0) return t;
        if (pathsEqual(t.history.current, ['This PC'])) {
          return { ...t, history: initialHistory(['This PC', 'My Storage']) };
        }
        return t;
      })
    );
  }, [authed]);

  const copyExplorerPath = useCallback((base: PathSegments, entry: ExplorerEntry) => {
    const tail = entry.pathSegment ?? entry.explorerPathSegment ?? entry.name;
    const text = formatPathDisplay([...base, tail]);
    void navigator.clipboard?.writeText(text);
  }, []);

  const copyPathSegments = useCallback((segments: PathSegments) => {
    void navigator.clipboard?.writeText(formatPathDisplay(segments));
  }, []);

  const deleteStorageEntry = useCallback(
    async (entry: ExplorerEntry) => {
      if (!entry.storage) return;
      if (!window.confirm(`Delete “${entry.name}” from cloud storage?`)) return;
      try {
        await storageDeleteMut({
          variables: {
            params: {
              bucket_type: entry.storage.bucket_type,
              file_path: entry.storage.file_path,
            },
          },
        });
        await bumpAndRefetchStorage();
      } catch (err) {
        swallowClientError('file-explorer.deleteStorage', err);
      }
    },
    [bumpAndRefetchStorage, storageDeleteMut]
  );

  const renameStorageEntry = useCallback(
    async (entry: ExplorerEntry) => {
      if (!entry.storage) return;
      const next = window.prompt('New file name', entry.name)?.trim();
      if (!next || next === entry.name) return;
      const to_path = replaceStorageFileName(entry.storage.file_path, next);
      try {
        await storageMoveMut({
          variables: {
            params: {
              bucket_type: entry.storage.bucket_type,
              from_path: entry.storage.file_path,
              to_path,
            },
          },
        });
        await bumpAndRefetchStorage();
      } catch (err) {
        swallowClientError('file-explorer.renameStorage', err);
      }
    },
    [bumpAndRefetchStorage, storageMoveMut]
  );

  const performStorageMkdir = useCallback(
    async (parentRelativeSegments: string[]) => {
      if (!authed) return;
      const nameRaw =
        typeof window !== 'undefined' ? window.prompt('New folder name', 'New folder') : null;
      if (nameRaw === null) return;
      const name = sanitizeNewFolderName(nameRaw);
      if (!name) {
        window.alert('Invalid folder name.');
        return;
      }
      const relParts = [...parentRelativeSegments, name];
      const folder_path = relParts.join('/');
      try {
        await storageMkdirMut({
          variables: {
            params: {
              bucket_type: STORAGE_BUCKET_UPLOADS,
              folder_path,
            },
          },
        });
        await bumpAndRefetchStorage();
      } catch (e) {
        console.error(e);
        window.alert('Could not create folder.');
      }
    },
    [authed, bumpAndRefetchStorage, storageMkdirMut]
  );

  type StorageUploadPayload = { success?: boolean; path?: string };

  const executeUploads = useCallback(
    async (
      baseSeg: string[],
      items: { id: string; file: File; webkit: boolean }[],
      update: (id: string, patch: UploadRowPatch) => void
    ) => {
      if (!authed && items.length > 0) {
        for (const it of items) {
          update(it.id, {
            status: 'error',
            errorMessage: 'Sign in to upload to My Storage.',
            progress: 0,
          });
        }
        return;
      }
      if (items.length === 0) {
        return;
      }

      const run = async () => {
        for (const it of items) {
          update(it.id, { status: 'uploading', progress: 12 });
          const relFromPicker = it.webkit
            ? it.file.webkitRelativePath || it.file.name
            : it.file.name;
          const file_path = joinStorageUploadRelativePath(baseSeg, relFromPicker);
          if (!file_path) {
            update(it.id, { status: 'error', errorMessage: 'Invalid path', progress: 0 });
            continue;
          }
          try {
            update(it.id, { progress: 5 });
            const tokens = readStoredAuthTokens();
            const authHeader = tokens?.access ? `Bearer ${tokens.access}` : null;
            await uploadFileInChunks(it.file, file_path, authHeader, (progress) => {
              update(it.id, { progress });
            });
            update(it.id, { status: 'completed', progress: 100 });
          } catch (e: unknown) {
            update(it.id, {
              status: 'error',
              errorMessage: e instanceof Error ? e.message : 'Upload failed',
              progress: 0,
            });
          }
        }
        await bumpAndRefetchStorage();
      };

      const next = uploadQueueChainRef.current.then(() => run());
      uploadQueueChainRef.current = next.catch(() => {});
      await next;
    },
    [authed, bumpAndRefetchStorage]
  );

  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());

  const patchActiveTabHistory = useCallback(
    (patch: (h: NavHistory) => NavHistory) => {
      setSelectedLeft(new Set());
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          return { ...t, history: patch(t.history) };
        })
      );
    },
    [activeTabId]
  );

  const patchRightHistory = useCallback((patch: (h: NavHistory) => NavHistory) => {
    setSelectedRight(new Set());
    setRightHistory((rh) => patch(rh));
  }, []);

  const activateTab = useCallback((id: string) => {
    setAddressFocused(false);
    setSelectedLeft(new Set());
    setActiveTabId(id);
  }, []);

  const navigateTo = useCallback(
    (path: PathSegments) => {
      if (!pathExists(path)) return;
      patchActiveTabHistory((h) => goTo(h, path));
    },
    [patchActiveTabHistory]
  );

  const onBack = useCallback(() => {
    patchActiveTabHistory((h) => back(h) ?? h);
  }, [patchActiveTabHistory]);

  const onForward = useCallback(() => {
    patchActiveTabHistory((h) => forward(h) ?? h);
  }, [patchActiveTabHistory]);

  const onUp = useCallback(() => {
    patchActiveTabHistory((h) => {
      const p = parentPath(h.current);
      if (!p || !pathExists(p)) return h;
      return goTo(h, p);
    });
  }, [patchActiveTabHistory]);

  const onAddressSubmit = useCallback(() => {
    const parsed = parseAddressInput(addressInputValue.trim());
    if (!parsed) {
      setAddressError('Enter a path such as This PC > Documents');
      return;
    }
    if (!pathExists(parsed) && !isUserStoragePath(parsed) && !isGoogleDrivePath(parsed)) {
      setAddressError('That location is not available in this demo.');
      return;
    }
    setAddressError(null);
    setAddressFocused(false);
    patchActiveTabHistory((h) => goTo(h, parsed));
  }, [addressInputValue, patchActiveTabHistory]);

  const leftStoragePayload = coerceStorageListPayload(storageLeftData?.storageList);
  const leftCloudPathKey = isUserStoragePath(leftPath) ? leftPath.join('/') : '';

  useEffect(() => {
    void refreshNonce;
    queueMicrotask(() => {
      if (!isUserStoragePath(leftPath)) {
        setLeftCloudStaleEntries({ pathKey: '', entries: [] });
        return;
      }
      if (!authed) {
        setLeftCloudStaleEntries({ pathKey: '', entries: [] });
        return;
      }
      const payload = coerceStorageListPayload(storageLeftData?.storageList);
      if (payload?.success === false) {
        setLeftCloudStaleEntries({ pathKey: leftCloudPathKey, entries: [] });
        return;
      }
      const files = payload?.files;
      if (Array.isArray(files)) {
        setLeftCloudStaleEntries({
          pathKey: leftCloudPathKey,
          entries: files.map(mapStorageRowToExplorerEntry),
        });
      }
    });
  }, [leftPath, leftCloudPathKey, authed, refreshNonce, storageLeftData]);

  const entries = useMemo<ExplorerEntry[]>(() => {
    void refreshNonce;
    if (isGoogleDriveAccountPickerPath(leftPath)) {
      if (!authed) return [];
      if (linkedGoogleAccounts.length === 0) return [];
      return linkedGoogleAccounts.map(linkedAccountToExplorerEntry);
    }
    if (isGoogleDriveFolderListPath(leftPath)) {
      if (!authed) return [];
      if (!leftDriveAccessToken && leftDriveTokenQ.loading) return [];
      if (!leftDriveAccessToken) return [];
      if (leftDriveList.pathKey !== leftDrivePathKey) return [];
      return leftDriveList.items;
    }
    if (isUserStoragePath(leftPath)) {
      if (!authed) return [];
      if (leftStoragePayload?.success === false) return [];
      const files = leftStoragePayload?.files;
      if (Array.isArray(files)) {
        return files.map(mapStorageRowToExplorerEntry);
      }
      if (leftCloudStaleEntries.pathKey === leftCloudPathKey) {
        return leftCloudStaleEntries.entries;
      }
      return [];
    }
    return listDirectory(leftPath);
  }, [
    leftPath,
    leftCloudPathKey,
    refreshNonce,
    leftStoragePayload,
    authed,
    leftCloudStaleEntries,
    linkedGoogleAccounts,
    leftDrivePathKey,
    leftDriveList,
    leftDriveAccessToken,
    leftDriveTokenQ.loading,
  ]);

  const filteredEntries = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, deferredSearch]);

  const sortedEntries = useMemo(() => {
    const arr = [...filteredEntries];
    if (viewMode !== 'details') return arr;
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'size':
          return dir * ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));
        case 'type':
          return dir * (a.typeLabel ?? '').localeCompare(b.typeLabel ?? '');
        case 'modified':
          return dir * (a.modified ?? '').localeCompare(b.modified ?? '');
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredEntries, viewMode, sortKey, sortDir]);

  const rightStoragePayload = coerceStorageListPayload(storageRightData?.storageList);
  const rightCloudPathKey = isUserStoragePath(rightPath) ? rightPath.join('/') : '';

  useEffect(() => {
    void refreshNonce;
    queueMicrotask(() => {
      if (!isUserStoragePath(rightPath)) {
        setRightCloudStaleEntries({ pathKey: '', entries: [] });
        return;
      }
      if (!authed) {
        setRightCloudStaleEntries({ pathKey: '', entries: [] });
        return;
      }
      const payload = coerceStorageListPayload(storageRightData?.storageList);
      if (payload?.success === false) {
        setRightCloudStaleEntries({ pathKey: rightCloudPathKey, entries: [] });
        return;
      }
      const files = payload?.files;
      if (Array.isArray(files)) {
        setRightCloudStaleEntries({
          pathKey: rightCloudPathKey,
          entries: files.map(mapStorageRowToExplorerEntry),
        });
      }
    });
  }, [rightPath, rightCloudPathKey, authed, refreshNonce, storageRightData]);

  const rightEntries = useMemo<ExplorerEntry[]>(() => {
    void refreshNonce;
    if (isGoogleDriveAccountPickerPath(rightPath)) {
      if (!authed) return [];
      if (linkedGoogleAccounts.length === 0) return [];
      return linkedGoogleAccounts.map(linkedAccountToExplorerEntry);
    }
    if (isGoogleDriveFolderListPath(rightPath)) {
      if (!authed) return [];
      if (!rightDriveAccessToken && rightDriveTokenQ.loading) return [];
      if (!rightDriveAccessToken) return [];
      if (rightDriveList.pathKey !== rightDrivePathKey) return [];
      return rightDriveList.items;
    }
    if (isUserStoragePath(rightPath)) {
      if (!authed) return [];
      if (rightStoragePayload?.success === false) return [];
      const files = rightStoragePayload?.files;
      if (Array.isArray(files)) {
        return files.map(mapStorageRowToExplorerEntry);
      }
      if (rightCloudStaleEntries.pathKey === rightCloudPathKey) {
        return rightCloudStaleEntries.entries;
      }
      return [];
    }
    return listDirectory(rightPath);
  }, [
    rightPath,
    rightCloudPathKey,
    refreshNonce,
    rightStoragePayload,
    authed,
    rightCloudStaleEntries,
    linkedGoogleAccounts,
    rightDrivePathKey,
    rightDriveList,
    rightDriveAccessToken,
    rightDriveTokenQ.loading,
  ]);

  const filteredRightEntries = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return rightEntries;
    return rightEntries.filter((e) => e.name.toLowerCase().includes(q));
  }, [rightEntries, deferredSearch]);

  const sortedRightEntries = useMemo(() => {
    const arr = [...filteredRightEntries];
    if (viewMode !== 'details') return arr;
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'size':
          return dir * ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));
        case 'type':
          return dir * (a.typeLabel ?? '').localeCompare(b.typeLabel ?? '');
        case 'modified':
          return dir * (a.modified ?? '').localeCompare(b.modified ?? '');
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredRightEntries, viewMode, sortKey, sortDir]);

  const canBack = history.past.length > 0;
  const canForward = history.future.length > 0;
  const canUp = parentPath(leftPath) !== null && pathExists(parentPath(leftPath)!);

  const buildLaunch = useCallback(
    (entry: ExplorerEntry, side: 'left' | 'right'): LaunchPayload => {
      if (entry.storage) {
        return { storage: entry.storage, fileName: entry.name };
      }
      const base = side === 'left' ? leftPath : rightPath;
      const driveUid = parseGoogleDriveUserId(base);
      if (entry.googleDrive && driveUid) {
        return {
          pathSegments: [...base],
          fileName: entry.name,
          googleDrive: {
            fileId: entry.googleDrive.fileId,
            googleUserId: driveUid,
            mimeType: entry.googleDrive.mimeType,
          },
        };
      }
      return { pathSegments: [...base], fileName: entry.name };
    },
    [leftPath, rightPath]
  );

  const openDefaultForFile = useCallback(
    (entry: ExplorerEntry, side: 'left' | 'right') => {
      if (entry.kind !== 'file') return;
      const ext = extensionFromFileName(entry.name);
      const app = resolveDefaultApp(ext, fileAssociations, installedIds);
      const useBrowser = shouldOpenGoogleDriveInBrowser(entry);
      // #region agent log
      void fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5e768c' },
        body: JSON.stringify({
          sessionId: '5e768c',
          location: 'FileExplorer.tsx:openDefaultForFile',
          message: 'drive_open_branch',
          data: {
            hypothesisId: 'H_DRIVE_OPEN',
            hasGoogleDrive: Boolean(entry.googleDrive),
            ext: ext || null,
            resolvedApp: app,
            useBrowser,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (useBrowser && entry.googleDrive?.webViewLink) {
        window.open(entry.googleDrive.webViewLink, '_blank', 'noopener,noreferrer');
        return;
      }
      const targetApp = app || 'viewer';
      openApp(targetApp, {
        ...buildLaunch(entry, side),
        ...galleryImageLaunchExtras(targetApp, entry.name),
      });
    },
    [openApp, buildLaunch, fileAssociations, installedIds]
  );

  const openEntry = useCallback(
    (entry: ExplorerEntry, side: 'left' | 'right') => {
      if (entry.kind === 'file') {
        openDefaultForFile(entry, side);
        return;
      }
      const base = side === 'left' ? leftPath : rightPath;
      const nextSeg = entry.pathSegment ?? entry.explorerPathSegment ?? entry.name;
      const nextPath = [...base, nextSeg] as PathSegments;
      const navigable =
        pathExists(nextPath) || isUserStoragePath(nextPath) || isGoogleDrivePath(nextPath);
      if (!navigable) return;
      if (side === 'left') {
        patchActiveTabHistory((h) => goTo(h, nextPath));
      } else {
        patchRightHistory((rh) => goTo(rh, nextPath));
      }
    },
    [leftPath, openDefaultForFile, patchActiveTabHistory, patchRightHistory, rightPath]
  );

  const toggleSelect = useCallback((id: string, e: React.MouseEvent, side: 'left' | 'right') => {
    const mod = e.metaKey || e.ctrlKey;
    const setter = side === 'left' ? setSelectedLeft : setSelectedRight;
    setter((prev) => {
      const next = mod ? new Set(prev) : new Set<string>();
      if (mod && prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addTab = useCallback(() => {
    const id = newTabId();
    setTabs((prev) => [...prev, { id, history: initialHistory() }]);
    activateTab(id);
  }, [activateTab]);

  const closeTab = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const neighbor = prev[idx - 1] ?? prev[idx + 1];
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId && neighbor) {
          Promise.resolve().then(() => activateTab(neighbor.id));
        }
        return next;
      });
    },
    [activeTabId, activateTab]
  );

  const runFileSearch = useCallback(() => {
    if (isGoogleDrivePath(searchScope)) {
      setSearchHits([]);
      setSearchRan(true);
      return;
    }
    if (isUserStoragePath(searchScope)) {
      if (!authed) {
        setSearchHits([]);
        setSearchRan(true);
        return;
      }
      const scopeMatchesLeft = pathsEqual(searchScope, leftPath);
      const rows = scopeMatchesLeft
        ? entries
        : pathsEqual(searchScope, rightPath)
          ? rightEntries
          : [];
      const pattern = searchNamePattern || '*';
      const phrase = searchPhrase.trim().toLowerCase();
      const hits: SearchHit[] = [];
      for (const e of rows) {
        if (e.kind !== 'file') continue;
        if (!globMatchesFileName(e.name, pattern)) continue;
        if (phrase && !e.name.toLowerCase().includes(phrase)) continue;
        hits.push({ entry: e, folderPath: searchScope });
      }
      setSearchHits(hits);
      setSearchRan(true);
      return;
    }
    const hits = enumerateFilesUnder(searchScope, {
      namePattern: searchNamePattern || '*',
      phrase: searchPhrase,
      includeHidden: searchIncludeHidden,
    });
    setSearchHits(hits);
    setSearchRan(true);
  }, [
    authed,
    entries,
    leftPath,
    rightEntries,
    searchIncludeHidden,
    searchNamePattern,
    searchPhrase,
    searchScope,
    rightPath,
  ]);

  const openWith = useCallback(
    (app: AppId, entry: ExplorerEntry, side: 'left' | 'right') => {
      openApp(app, {
        ...buildLaunch(entry, side),
        ...galleryImageLaunchExtras(app, entry.name),
      });
    },
    [openApp, buildLaunch]
  );

  const headerSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const renderFolderContextMenu = (
    entry: ExplorerEntry,
    side: 'left' | 'right',
    trigger: React.ReactNode
  ) => {
    const base = side === 'left' ? leftPath : rightPath;
    const cloud = isUserStoragePath(base) && authed;
    const driveHere = isGoogleDrivePath(base) && authed;
    return (
      <ContextMenu key={entry.id}>
        <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
        <ContextMenuContent className="border-white/10 bg-slate-900/95 text-slate-100">
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => {
              const nextSeg = entry.pathSegment ?? entry.explorerPathSegment ?? entry.name;
              const nextPath = [...base, nextSeg] as PathSegments;
              const navigable =
                pathExists(nextPath) || isUserStoragePath(nextPath) || isGoogleDrivePath(nextPath);
              if (!navigable) return;
              if (side === 'left') patchActiveTabHistory((h) => goTo(h, nextPath));
              else patchRightHistory((rh) => goTo(rh, nextPath));
            }}
          >
            Open
          </ContextMenuItem>
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => copyExplorerPath(base, entry)}
          >
            Copy path
          </ContextMenuItem>
          {cloud ? (
            <>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  const folderFullPath = [...base, entry.name] as PathSegments;
                  const folder_path = storageFolderPathFromExplorerPath(folderFullPath, userSub);
                  if (!folder_path) return;
                  openApp('void-ide', {
                    voidIdeStorageFolder: {
                      bucket_type: STORAGE_BUCKET_UPLOADS,
                      folder_path,
                      rootLabel: entry.name,
                    },
                  });
                }}
              >
                Open in Void IDE
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => bumpAndRefetchStorage()}
              >
                Refresh listing
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  const folderFullPath = [...base, entry.name] as PathSegments;
                  void performStorageMkdir(relativeSegmentsUnderMyStorage(folderFullPath));
                }}
              >
                New folder…
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  const folderFullPath = [...base, entry.name] as PathSegments;
                  openUploadPanel(relativeSegmentsUnderMyStorage(folderFullPath));
                }}
              >
                Upload files…
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  const folderFullPath = [...base, entry.name] as PathSegments;
                  openUploadPanel(relativeSegmentsUnderMyStorage(folderFullPath));
                }}
              >
                Upload folder…
              </ContextMenuItem>
            </>
          ) : null}
          {driveHere ? (
            <>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => setDriveRefreshNonce((n) => n + 1)}
              >
                Refresh listing
              </ContextMenuItem>
              <ContextMenuItem className="focus:bg-white/10" onSelect={() => openApp('drive')}>
                Open Drive app
              </ContextMenuItem>
            </>
          ) : null}
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => openApp('settings', { settingsTab: 'Default apps' })}
          >
            Default apps…
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => {
              const fullPath = [
                ...base,
                entry.pathSegment ?? entry.explorerPathSegment ?? entry.name,
              ] as PathSegments;
              const type = folderKindLabel(fullPath);
              const pathStr = formatPathDisplay(fullPath);
              const mod = formatModified(entry.modified);
              window.alert(
                `Folder Properties\n\nName: ${entry.name}\nType: ${type}\nLocation: ${pathStr}\nModified: ${mod}`
              );
            }}
          >
            Properties
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderFileContextMenu = (
    entry: ExplorerEntry,
    side: 'left' | 'right',
    trigger: React.ReactNode
  ) => {
    const ext = extensionFromFileName(entry.name);
    const candidates = getAppsSupportingExtension(ext).filter((id) => installedIds.has(id));
    const base = side === 'left' ? leftPath : rightPath;
    const cloudFile = Boolean(entry.storage) && isUserStoragePath(base) && authed;
    const driveFile = Boolean(entry.googleDrive) && isGoogleDrivePath(base) && authed;
    const canGallery = installedIds.has('gallery') && appSupportsExtension('gallery', ext);
    const canArchiver = installedIds.has('archiver') && appSupportsExtension('archiver', ext);
    return (
      <ContextMenu key={entry.id}>
        <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
        <ContextMenuContent className="border-white/10 bg-slate-900/95 text-slate-100">
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => openDefaultForFile(entry, side)}
          >
            Open
          </ContextMenuItem>
          {candidates.length > 0 ? (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-white/10 data-[state=open]:bg-white/10">
                Open with
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="border-white/10 bg-slate-900/95 text-slate-100">
                {candidates.map((app) => (
                  <ContextMenuItem
                    key={app}
                    className="focus:bg-white/10"
                    onSelect={() => openWith(app, entry, side)}
                  >
                    {APPS[app].name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : null}
          {(canGallery || canArchiver) && ext ? (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-white/10 data-[state=open]:bg-white/10">
                Quick open
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="border-white/10 bg-slate-900/95 text-slate-100">
                {canGallery ? (
                  <ContextMenuItem
                    className="focus:bg-white/10"
                    onSelect={() => openWith('gallery', entry, side)}
                  >
                    Gallery
                  </ContextMenuItem>
                ) : null}
                {canArchiver ? (
                  <ContextMenuItem
                    className="focus:bg-white/10"
                    onSelect={() => openWith('archiver', entry, side)}
                  >
                    Archiver
                  </ContextMenuItem>
                ) : null}
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : null}
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => copyExplorerPath(base, entry)}
          >
            Copy path
          </ContextMenuItem>
          {ext ? (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => openApp('settings', { settingsTab: 'Default apps' })}
            >
              Default apps for .{ext}…
            </ContextMenuItem>
          ) : null}
          {cloudFile ? (
            <>
              <ContextMenuSeparator className="bg-white/10" />
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => void renameStorageEntry(entry)}
              >
                Rename…
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10 text-rose-300"
                onSelect={() => void deleteStorageEntry(entry)}
              >
                Delete from cloud
              </ContextMenuItem>
            </>
          ) : null}
          {/* ── AI Actions ── */}
          {cloudFile ? (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-white/10 data-[state=open]:bg-white/10">
                <Sparkles className="mr-2 h-3.5 w-3.5 text-violet-400" aria-hidden />
                AI Actions
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="border-white/10 bg-slate-900/95 text-slate-100">
                <ContextMenuItem
                  className="focus:bg-white/10"
                  onSelect={() =>
                    openApp('chat', {
                      initialPrompt: `Summarize the file: ${entry.name}\nPath: ${entry.storage?.file_path ?? entry.name}`,
                    })
                  }
                >
                  <Brain className="mr-2 h-3.5 w-3.5 text-fuchsia-400" aria-hidden />
                  Summarize with AI
                </ContextMenuItem>
                <ContextMenuItem
                  className="focus:bg-white/10"
                  onSelect={() =>
                    openApp('chat', {
                      initialPrompt: `Embed this file into the RAG knowledge base:\nFile: ${entry.name}\nPath: ${entry.storage?.file_path ?? entry.name}\n\nPlease chunk, embed and store this document so it can be queried.`,
                    })
                  }
                >
                  <Brain className="mr-2 h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  Embed to RAG
                </ContextMenuItem>
                <ContextMenuItem
                  className="focus:bg-white/10"
                  onSelect={() =>
                    openApp('chat', {
                      initialPrompt: `Analyze this file and give me insights:\nFile: ${entry.name}\nPath: ${entry.storage?.file_path ?? entry.name}`,
                    })
                  }
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-sky-400" aria-hidden />
                  Analyze
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : null}
          {/* ── Tag management ── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="focus:bg-white/10 data-[state=open]:bg-white/10">
              <Tag className="mr-2 h-3.5 w-3.5 text-amber-400" aria-hidden />
              Tags
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="border-white/10 bg-slate-900/95 text-slate-100 min-w-[140px]">
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  const tagKey = entry.storage?.file_path ?? entry.name;
                  const input = window.prompt('Add tag (e.g. important, review, done):');
                  if (input) addTag(tagKey, input);
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" aria-hidden />
                Add tag…
              </ContextMenuItem>
              {getFileTags(entry.storage?.file_path ?? entry.name).map((t) => (
                <ContextMenuItem
                  key={t}
                  className="focus:bg-white/10 text-white/60"
                  onSelect={() => removeTag(entry.storage?.file_path ?? entry.name, t)}
                >
                  <X className="mr-2 h-3 w-3 text-rose-400" aria-hidden />
                  Remove: {t}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          {driveFile && entry.googleDrive?.webViewLink ? (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => {
                window.open(entry.googleDrive!.webViewLink!, '_blank', 'noopener,noreferrer');
              }}
            >
              Open in Google Drive (browser)
            </ContextMenuItem>
          ) : null}
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => {
              const fullPath = [...base, entry.name] as PathSegments;
              const pathStr = formatPathDisplay(fullPath);
              const mod = formatModified(entry.modified);
              const size = formatBytes(entry.sizeBytes);
              const type =
                entry.typeLabel ?? `${extensionFromFileName(entry.name).toUpperCase()} File`;

              if (entry.googleDrive) {
                window.alert(
                  `Google Drive File Properties\n\nName: ${entry.name}\nType: ${type}\nLocation: ${pathStr}\nSize: ${size}\nID: ${entry.googleDrive.fileId}\nMIME: ${entry.googleDrive.mimeType ?? '—'}\nModified: ${mod}`
                );
              } else {
                window.alert(
                  `File Properties\n\nName: ${entry.name}\nType: ${type}\nLocation: ${pathStr}\nSize: ${size}\nModified: ${mod}`
                );
              }
            }}
          >
            Properties
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  /** Right-click empty area of the folder pane (grid/list/table surface), not only on rows/tiles. */
  const renderPaneSurfaceContextMenu = (
    side: 'left' | 'right',
    basePath: PathSegments,
    surfaceClassName: string,
    surfaceProps: { role?: string },
    children: React.ReactNode
  ) => {
    const cloud = isUserStoragePath(basePath) && authed;
    const driveHere = isGoogleDrivePath(basePath) && authed;
    return (
      <ContextMenu key={`pane-surface-${side}-${pathKey(basePath)}`}>
        <ContextMenuTrigger asChild>
          <div className={surfaceClassName} {...surfaceProps}>
            {children}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="border-white/10 bg-slate-900/95 text-slate-100">
          <ContextMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Current folder
          </ContextMenuLabel>
          {cloud ? (
            <>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  const folder_path = storageFolderPathFromExplorerPath(basePath, userSub);
                  if (!folder_path) return;
                  openApp('void-ide', {
                    voidIdeStorageFolder: {
                      bucket_type: STORAGE_BUCKET_UPLOADS,
                      folder_path,
                      rootLabel: basePath[basePath.length - 1] ?? 'My Storage',
                    },
                  });
                }}
              >
                Open in Void IDE
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => bumpAndRefetchStorage()}
              >
                Refresh listing
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => copyPathSegments(basePath)}
              >
                Copy folder path
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => {
                  void performStorageMkdir(relativeSegmentsUnderMyStorage(basePath));
                }}
              >
                New folder…
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => openUploadPanel(relativeSegmentsUnderMyStorage(basePath))}
              >
                Upload files…
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => openUploadPanel(relativeSegmentsUnderMyStorage(basePath))}
              >
                Upload folder…
              </ContextMenuItem>
            </>
          ) : driveHere ? (
            <>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => setDriveRefreshNonce((n) => n + 1)}
              >
                Refresh listing
              </ContextMenuItem>
              <ContextMenuItem
                className="focus:bg-white/10"
                onSelect={() => copyPathSegments(basePath)}
              >
                Copy folder path
              </ContextMenuItem>
              <ContextMenuItem className="focus:bg-white/10" onSelect={() => openApp('drive')}>
                Open Drive app
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => copyPathSegments(basePath)}
            >
              Copy path
            </ContextMenuItem>
          )}
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem
            className="focus:bg-white/10"
            onSelect={() => openApp('settings', { settingsTab: 'Default apps' })}
          >
            Default apps…
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem className="focus:bg-white/10" disabled>
            Properties (demo)
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderPane = (
    side: 'left' | 'right',
    h: NavHistory,
    list: ExplorerEntry[],
    selected: Set<string>,
    patchHistory: (patch: (prev: NavHistory) => NavHistory) => void,
    sortedList: ExplorerEntry[],
    paneExtra?: ReactNode
  ) => (
    <div
      className={cn('flex min-h-0 min-w-0 flex-1 flex-col', side === 'right' && 'bg-white/[0.03]')}
      onMouseDown={(e) => {
        if (e.button === 0) setActivePane(side);
      }}
    >
      <nav
        className="flex h-10 shrink-0 items-center gap-1 border-b border-white/5 px-3 text-xs text-white/70"
        aria-label={side === 'left' ? 'Current folder path' : 'Secondary folder path'}
      >
        {h.current.map((segment, i) => (
          <div key={`${pathKey(h.current)}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <span className="text-white/25">›</span>}
            <button
              type="button"
              className="truncate rounded px-1 py-0.5 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
              onClick={() => {
                const prefix = h.current.slice(0, i + 1) as PathSegments;
                if (!pathExists(prefix) && !isUserStoragePath(prefix) && !isGoogleDrivePath(prefix))
                  return;
                patchHistory((prev) => goTo(prev, prefix));
              }}
            >
              {isGoogleDrivePath(h.current) ? (drivePathLabels[segment] ?? segment) : segment}
            </button>
          </div>
        ))}
      </nav>

      {viewMode === 'details'
        ? renderPaneSurfaceContextMenu(
            side,
            h.current,
            'min-h-0 flex-1 overflow-auto',
            {},
            <table className="w-full min-w-[420px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-[1] border-b border-white/10 bg-slate-900/95">
                <tr className="text-white/50">
                  <th className="w-10 p-2" aria-hidden />
                  <th className="p-2">
                    <button
                      type="button"
                      className="font-semibold hover:text-white"
                      onClick={() => headerSort('name')}
                    >
                      Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="p-2 text-right">
                    <button
                      type="button"
                      className="font-semibold hover:text-white"
                      onClick={() => headerSort('size')}
                    >
                      Size {sortKey === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="p-2">
                    <button
                      type="button"
                      className="font-semibold hover:text-white"
                      onClick={() => headerSort('type')}
                    >
                      Type {sortKey === 'type' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="p-2">
                    <button
                      type="button"
                      className="font-semibold hover:text-white"
                      onClick={() => headerSort('modified')}
                    >
                      Modified {sortKey === 'modified' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/40">
                      {(() => {
                        const p = h.current;
                        const driveWait =
                          isGoogleDriveFolderListPath(p) &&
                          (side === 'left'
                            ? leftDriveLoading ||
                              (Boolean(leftDriveUid) &&
                                leftDriveTokenQ.loading &&
                                !leftDriveAccessToken)
                            : rightDriveLoading ||
                              (Boolean(rightDriveUid) &&
                                rightDriveTokenQ.loading &&
                                !rightDriveAccessToken));
                        const noDriveToken =
                          isGoogleDriveFolderListPath(p) &&
                          authed &&
                          !driveWait &&
                          (side === 'left'
                            ? Boolean(leftDriveUid) &&
                              !leftDriveAccessToken &&
                              !leftDriveTokenQ.loading
                            : Boolean(rightDriveUid) &&
                              !rightDriveAccessToken &&
                              !rightDriveTokenQ.loading);
                        return (
                          <>
                            <p>{driveWait ? 'Loading Google Drive…' : 'This folder is empty.'}</p>
                            {isGoogleDriveAccountPickerPath(p) && !authed ? (
                              <p className="mt-2 text-xs text-white/50">
                                Sign in to see linked Google accounts.
                              </p>
                            ) : null}
                            {isGoogleDriveAccountPickerPath(p) &&
                            authed &&
                            linkedGoogleAccounts.length === 0 ? (
                              <p className="mt-2 text-xs text-white/50">
                                No Google accounts linked. Open Settings → Accounts.
                              </p>
                            ) : null}
                            {noDriveToken ? (
                              <p className="mt-2 text-xs text-amber-200/90">
                                No Drive access token. Re-link the account in Settings → Accounts.
                              </p>
                            ) : null}
                            {isUserStoragePath(p) && authed ? (
                              <p className="mt-2 text-xs text-white/45">
                                Files you upload to your account appear here.
                              </p>
                            ) : null}
                            {isUserStoragePath(p) && !authed ? (
                              <p className="mt-2 text-xs text-white/50">
                                Sign in to load files from My Storage.
                              </p>
                            ) : null}
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                ) : (
                  sortedList.map((entry) => {
                    const isFolderLike = entry.kind !== 'file';
                    const row = (
                      <tr
                        key={entry.id}
                        className={cn(
                          'cursor-pointer border-b border-white/5 hover:bg-white/5',
                          selected.has(entry.id) ? 'bg-blue-500/20' : ''
                        )}
                        onClick={(e) => toggleSelect(entry.id, e, side)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          openEntry(entry, side);
                        }}
                      >
                        <td className="p-2">
                          <EntryIcon entry={entry} />
                        </td>
                        <td className="max-w-[min(40vw,280px)] min-w-0 p-2 font-medium text-white/90">
                          <div className="flex flex-col gap-1">
                            <span className="truncate">{entry.name}</span>
                            <FileTagChips
                              tags={getFileTags(entry.storage?.file_path ?? entry.name)}
                              compact
                              onRemove={(t) => removeTag(entry.storage?.file_path ?? entry.name, t)}
                            />
                          </div>
                        </td>
                        <td className="max-w-[72px] truncate p-2 text-right tabular-nums text-white/70">
                          {formatBytes(entry.sizeBytes)}
                        </td>
                        <td className="p-2 text-white/50">{entry.typeLabel ?? '—'}</td>
                        <td className="p-2 text-white/50">{formatModified(entry.modified)}</td>
                      </tr>
                    );
                    return isFolderLike
                      ? renderFolderContextMenu(entry, side, row)
                      : renderFileContextMenu(entry, side, row);
                  })
                )}
              </tbody>
            </table>
          )
        : list.length === 0
          ? renderPaneSurfaceContextMenu(
              side,
              h.current,
              cn(
                'min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin',
                viewMode === 'grid'
                  ? 'grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 auto-rows-max'
                  : 'flex flex-col gap-1'
              ),
              {},
              <div
                className="col-span-full flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-white/40"
                role="status"
              >
                <Folder className="h-10 w-10 opacity-30" strokeWidth={1} />
                {(() => {
                  const p = h.current;
                  const driveWait =
                    isGoogleDriveFolderListPath(p) &&
                    (side === 'left'
                      ? leftDriveLoading ||
                        (Boolean(leftDriveUid) && leftDriveTokenQ.loading && !leftDriveAccessToken)
                      : rightDriveLoading ||
                        (Boolean(rightDriveUid) &&
                          rightDriveTokenQ.loading &&
                          !rightDriveAccessToken));
                  const noDriveToken =
                    isGoogleDriveFolderListPath(p) &&
                    authed &&
                    !driveWait &&
                    (side === 'left'
                      ? Boolean(leftDriveUid) && !leftDriveAccessToken && !leftDriveTokenQ.loading
                      : Boolean(rightDriveUid) &&
                        !rightDriveAccessToken &&
                        !rightDriveTokenQ.loading);
                  return (
                    <>
                      <p>{driveWait ? 'Loading Google Drive…' : 'This folder is empty.'}</p>
                      {isGoogleDriveAccountPickerPath(p) && !authed ? (
                        <p className="text-xs text-white/50">
                          Sign in to see linked Google accounts.
                        </p>
                      ) : null}
                      {isGoogleDriveAccountPickerPath(p) &&
                      authed &&
                      linkedGoogleAccounts.length === 0 ? (
                        <p className="text-xs text-white/50">
                          No Google accounts linked. Open Settings → Accounts.
                        </p>
                      ) : null}
                      {noDriveToken ? (
                        <p className="text-xs text-amber-200/90">
                          No Drive access token. Re-link the account in Settings → Accounts.
                        </p>
                      ) : null}
                      {isUserStoragePath(p) && authed ? (
                        <p className="text-xs text-white/45">
                          Files you upload to your account appear here.
                        </p>
                      ) : null}
                      {isUserStoragePath(p) && !authed ? (
                        <p className="text-xs text-white/50">
                          Sign in to load files from My Storage.
                        </p>
                      ) : null}
                    </>
                  );
                })()}
                {deferredSearch.trim() ? (
                  <p className="text-xs text-white/30">Try clearing the search filter.</p>
                ) : null}
              </div>
            )
          : renderPaneSurfaceContextMenu(
              side,
              h.current,
              cn(
                'min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin',
                viewMode === 'grid'
                  ? 'grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 auto-rows-max'
                  : 'flex flex-col gap-1'
              ),
              { role: 'list' },
              <>
                {list.map((entry) => {
                  const isFolderLike = entry.kind !== 'file';
                  const inner = (
                    <button
                      key={entry.id}
                      type="button"
                      role="listitem"
                      className={cn(
                        'flex items-center gap-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                        reducedMotion ? '' : 'duration-150',
                        viewMode === 'grid'
                          ? 'w-full min-w-0 max-w-full flex-col justify-center overflow-hidden p-3 text-center'
                          : 'w-full min-w-0 flex-row p-2',
                        selected.has(entry.id)
                          ? 'bg-blue-500/25 ring-1 ring-blue-400/40'
                          : 'bg-transparent hover:bg-white/10'
                      )}
                      onClick={(e) => toggleSelect(entry.id, e, side)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        openEntry(entry, side);
                      }}
                    >
                      <div
                        className={cn(
                          'flex shrink-0 items-center justify-center',
                          viewMode === 'grid'
                            ? 'h-11 w-11 rounded-lg border border-white/10 bg-white/5'
                            : ''
                        )}
                      >
                        <EntryIcon entry={entry} />
                      </div>
                      <span
                        className={cn(
                          'text-xs text-white',
                          viewMode === 'grid'
                            ? 'line-clamp-2 max-h-[2.6rem] w-full min-w-0 overflow-hidden break-words leading-tight [overflow-wrap:anywhere]'
                            : 'min-w-0 flex-1 truncate'
                        )}
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                      {viewMode === 'grid' && (
                        <FileTagChips
                          tags={getFileTags(entry.storage?.file_path ?? entry.name)}
                          compact
                          className="justify-center mt-1"
                          onRemove={(t) => removeTag(entry.storage?.file_path ?? entry.name, t)}
                        />
                      )}
                      {viewMode === 'list' && (
                        <FileTagChips
                          tags={getFileTags(entry.storage?.file_path ?? entry.name)}
                          compact
                          className="ml-2 shrink-0"
                        />
                      )}
                    </button>
                  );
                  const wrap = isFolderLike
                    ? renderFolderContextMenu(entry, side, inner)
                    : renderFileContextMenu(entry, side, inner);
                  return wrap;
                })}
              </>
            )}
      {paneExtra}
    </div>
  );

  const sidebarNavButton = (label: string, target: PathSegments, active: boolean) => (
    <button
      key={label}
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
        active ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:bg-white/5'
      )}
      onClick={() => navigateTo(target)}
    >
      {label}
    </button>
  );

  const statusLeft =
    explorerMode === 'search' && searchRan
      ? `${searchHits.length} file(s) found`
      : `${filteredEntries.length} item(s) · ${selectedLeft.size} selected · ${folderKindLabel(leftPath)}`;

  const folderTreeResolveChildren = useCallback(
    (segments: PathSegments): MockFsEntry[] | undefined => {
      if (pathKey(segments) !== 'This PC/Google Drive') return undefined;
      if (!authed || linkedGoogleAccounts.length === 0) return undefined;
      return linkedGoogleAccounts.map((a) => ({
        id: `gd-tree-${a.googleUserId}`,
        name: a.displayName?.trim() || a.email || a.googleUserId,
        pathSegment: a.googleUserId,
        kind: 'folder',
        icon: 'drive',
        typeLabel: 'Google account',
      }));
    },
    [authed, linkedGoogleAccounts]
  );

  const leftDrivePaneFooter: ReactNode = isGoogleDriveFolderListPath(leftPath) ? (
    <>
      {leftDriveLoading ? (
        <div className="shrink-0 border-t border-white/10 px-3 py-2 text-center text-xs text-white/50">
          Loading Google Drive…
        </div>
      ) : null}
      {!leftDriveLoading &&
      leftDriveList.pathKey === leftDrivePathKey &&
      Boolean(leftDriveList.nextToken) ? (
        <div className="shrink-0 border-t border-white/10 p-2">
          <button
            type="button"
            disabled={leftDriveLoadingMore}
            className="w-full rounded-md border border-white/15 bg-white/5 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
            onClick={() => void loadMoreLeftDrive()}
          >
            {leftDriveLoadingMore ? 'Loading…' : 'Load more from Drive'}
          </button>
        </div>
      ) : null}
    </>
  ) : null;

  const rightDrivePaneFooter: ReactNode = isGoogleDriveFolderListPath(rightPath) ? (
    <>
      {rightDriveLoading ? (
        <div className="shrink-0 border-t border-white/10 px-3 py-2 text-center text-xs text-white/50">
          Loading Google Drive…
        </div>
      ) : null}
      {!rightDriveLoading &&
      rightDriveList.pathKey === rightDrivePathKey &&
      Boolean(rightDriveList.nextToken) ? (
        <div className="shrink-0 border-t border-white/10 p-2">
          <button
            type="button"
            disabled={rightDriveLoadingMore}
            className="w-full rounded-md border border-white/15 bg-white/5 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
            onClick={() => void loadMoreRightDrive()}
          >
            {rightDriveLoadingMore ? 'Loading…' : 'Load more from Drive'}
          </button>
        </div>
      ) : null}
    </>
  ) : null;

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-900/90 text-slate-200">
      <div className="flex h-9 shrink-0 items-stretch gap-0 border-b border-white/10 frost-glass-surface px-1">
        <nav className="flex min-w-0 flex-1 items-stretch gap-0" aria-label="Folder tabs">
          {tabs.map((tab) => {
            const label = defaultTabLabel(tab.history.current);
            const isActive = tab.id === activeTabId;
            const tabRowClass = cn(
              'group relative flex min-w-0 max-w-[11rem] items-center border-b-2',
              isActive ? 'border-blue-400 bg-white/10' : 'border-transparent hover:bg-white/5'
            );
            const tabButtonClass =
              'flex min-h-0 min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-xs text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/50';
            const closeButtonClass = cn(
              'mr-1 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
              tabs.length > 1
                ? 'opacity-0 group-hover:opacity-100'
                : 'pointer-events-none opacity-0'
            );
            return (
              <div key={tab.id} className={tabRowClass}>
                {isActive ? (
                  <button
                    type="button"
                    aria-current="true"
                    className={tabButtonClass}
                    onClick={() => activateTab(tab.id)}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400/90" strokeWidth={1.5} />
                    <span className="truncate">{label}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={tabButtonClass}
                    onClick={() => activateTab(tab.id)}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400/90" strokeWidth={1.5} />
                    <span className="truncate">{label}</span>
                  </button>
                )}
                <button
                  type="button"
                  className={closeButtonClass}
                  title={`Close ${label}`}
                  onClick={(e) => closeTab(tab.id, e)}
                >
                  <span className="sr-only">Close {label}</span>
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            );
          })}
        </nav>
        <button
          type="button"
          className="flex w-8 shrink-0 items-center justify-center text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
          title="New tab"
          onClick={addTab}
        >
          <span className="sr-only">New tab</span>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex h-12 shrink-0 flex-wrap items-center gap-2 border-b border-white/10 frost-glass-surface px-3">
        <div className="flex items-center gap-0.5">
          <IconButton label="Back" disabled={!canBack} onClick={onBack} icon={ArrowLeft} />
          <IconButton
            label="Forward"
            disabled={!canForward}
            onClick={onForward}
            icon={ArrowRight}
          />
          <IconButton label="Up" disabled={!canUp} onClick={onUp} icon={ArrowUp} />
          <IconButton label="Refresh" onClick={onToolbarRefresh} icon={RotateCw} />
          {toolbarInCloud ? (
            <>
              <IconButton
                label="Upload files"
                onClick={() => openUploadPanel(relativeSegmentsUnderMyStorage(toolbarStoragePath))}
                icon={Upload}
              />
              <IconButton
                label="Upload folder"
                onClick={() => openUploadPanel(relativeSegmentsUnderMyStorage(toolbarStoragePath))}
                icon={FolderUp}
              />
              <IconButton
                label="New folder"
                onClick={() =>
                  void performStorageMkdir(relativeSegmentsUnderMyStorage(toolbarStoragePath))
                }
                icon={FolderPlus}
              />
            </>
          ) : null}
        </div>

        <div className="hidden h-6 w-px bg-white/10 sm:block" />

        <div className="flex min-w-[8rem] items-center gap-1">
          <button
            type="button"
            className={cn(
              'rounded-md px-2 py-1 text-[10px] font-semibold uppercase',
              explorerMode === 'browse'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/10'
            )}
            onClick={() => setExplorerMode('browse')}
          >
            Browse
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-2 py-1 text-[10px] font-semibold uppercase',
              explorerMode === 'search'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/10'
            )}
            onClick={() => setExplorerMode('search')}
          >
            Search
          </button>
        </div>

        {explorerMode === 'browse' ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <label className="sr-only" htmlFor="fe-address">
                Address
              </label>
              <div className="relative flex min-w-0 flex-1 items-center">
                <Input
                  id="fe-address"
                  type="text"
                  value={addressInputValue}
                  onChange={(e) => {
                    setAddressDraft(e.target.value);
                    setAddressError(null);
                  }}
                  onFocus={() => {
                    setAddressFocused(true);
                    setAddressDraft(displayPath);
                  }}
                  onBlur={() => setAddressFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onAddressSubmit();
                  }}
                  className="w-full min-w-0 border-white/10 bg-black/25 py-1.5 pl-2 pr-16 text-white placeholder:text-white/30 focus-visible:border-blue-500/50"
                  placeholder="This PC > Documents"
                  aria-invalid={Boolean(addressError)}
                  aria-describedby={addressError ? 'fe-address-err' : undefined}
                />
                <div className="pointer-events-none absolute right-2 flex items-center gap-1 text-white/35">
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </div>
              </div>
            </div>

            <div className="relative w-52 max-w-[40vw] shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter folder"
                className="rounded-full border-white/10 bg-black/25 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-white/35 focus-visible:border-blue-500/50"
              />
            </div>
          </>
        ) : null}
      </div>
      {addressError && explorerMode === 'browse' ? (
        <div
          id="fe-address-err"
          role="alert"
          className="border-b border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-200"
        >
          {addressError}
        </div>
      ) : null}

      {explorerMode === 'browse' ? (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/5 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Drives</span>
            <div className="flex flex-wrap gap-1">
              {THIS_PC_PLACES.map(({ label, path }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigateTo(path)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] hover:bg-white/10',
                    pathsEqual(leftPath, path) ? 'border-blue-400/50 bg-blue-500/15' : ''
                  )}
                >
                  <HardDrive className="h-3.5 w-3.5 text-slate-300" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-white/5 frost-glass-surface px-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                View
              </span>
              <div className="flex items-center rounded-lg border border-white/5 bg-black/30 p-0.5">
                {viewMode === 'grid' ? (
                  <button
                    type="button"
                    className="rounded-md bg-white/20 p-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    aria-pressed="true"
                    title="Grid view"
                    aria-label="Grid view"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    aria-pressed="false"
                    title="Grid view"
                    aria-label="Grid view"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden />
                  </button>
                )}
                {viewMode === 'list' ? (
                  <button
                    type="button"
                    className="rounded-md bg-white/20 p-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    aria-pressed="true"
                    title="List view"
                    aria-label="List view"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    aria-pressed="false"
                    title="List view"
                    aria-label="List view"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" aria-hidden />
                  </button>
                )}
                {viewMode === 'details' ? (
                  <button
                    type="button"
                    className="rounded-md bg-white/20 p-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    aria-pressed="true"
                    title="Details view"
                    aria-label="Details view"
                    onClick={() => setViewMode('details')}
                  >
                    <Table2 className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    aria-pressed="false"
                    title="Details view"
                    aria-label="Details view"
                    onClick={() => setViewMode('details')}
                  >
                    <Table2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <button
                type="button"
                className={cn(
                  'ml-1 flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium uppercase',
                  showFolderTree
                    ? 'border-blue-400/40 bg-blue-500/15 text-blue-200'
                    : 'border-white/10 text-white/50 hover:bg-white/5'
                )}
                onClick={() => setShowFolderTree((v) => !v)}
              >
                <PanelLeft className="h-3.5 w-3.5" />
                Folders
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
              <Checkbox
                checked={dualPane}
                onChange={(e) => {
                  setDualPane(e.target.checked);
                  if (!e.target.checked) {
                    setActivePane('left');
                    setRightHistory(initialHistory(['This PC', 'Documents']));
                    setSelectedRight(new Set());
                  }
                }}
                aria-label="Dual pane"
                className="border-white/25"
              />
              Dual pane
            </label>
          </div>
        </>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {explorerMode === 'search' ? (
            <div className="flex min-h-0 flex-1">
              <aside className="w-56 shrink-0 overflow-y-auto border-r border-white/10 p-3 text-xs">
                <p className="mb-2 font-medium text-white/80">Search by criteria</p>
                <label className="mb-1 block text-white/50">File name</label>
                <Input
                  value={searchNamePattern}
                  onChange={(e) => setSearchNamePattern(e.target.value)}
                  className="mb-3 border-white/10 bg-black/30 text-white"
                  placeholder="*.txt"
                />
                <label className="mb-1 block text-white/50">Word in file (stub)</label>
                <Input
                  value={searchPhrase}
                  onChange={(e) => setSearchPhrase(e.target.value)}
                  className="mb-3 border-white/10 bg-black/30 text-white"
                />
                <label className="mb-1 block text-white/50" htmlFor="fe-search-look-in">
                  Look in
                </label>
                <select
                  id="fe-search-look-in"
                  className="mb-3 w-full rounded-md border border-white/10 bg-black/30 py-1.5 text-white"
                  value={pathKey(searchScope)}
                  title="Search scope folder"
                  onChange={(e) => {
                    const opt = SEARCH_SCOPES.find((o) => pathKey(o.path) === e.target.value);
                    if (opt) setSearchScope(opt.path);
                  }}
                >
                  {SEARCH_SCOPES.map((o) => (
                    <option key={pathKey(o.path)} value={pathKey(o.path)}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-white/70">
                  <Checkbox
                    checked={searchIncludeHidden}
                    onChange={(e) => setSearchIncludeHidden(e.target.checked)}
                    className="border-white/25"
                  />
                  Include hidden
                </label>
                <button
                  type="button"
                  className="w-full rounded-lg bg-blue-600/80 py-2 text-sm font-medium text-white hover:bg-blue-600"
                  onClick={runFileSearch}
                >
                  Search
                </button>
                <p className="mt-3 text-[10px] leading-relaxed text-white/35">
                  <span className="font-medium text-white/45">
                    My Storage (current folder only):
                  </span>{' '}
                  matches files already listed in the pane for the folder you have open—not your
                  entire cloud tree.
                </p>
              </aside>
              <div className="min-h-0 min-w-0 flex-1 overflow-auto p-2">
                <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 border-b border-white/10 bg-slate-900/95 text-white/50">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">In folder</th>
                      <th className="p-2 text-right">Size</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!searchRan ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-white/40">
                          Set criteria and click Search.
                        </td>
                      </tr>
                    ) : searchHits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-white/40">
                          No files found.
                        </td>
                      </tr>
                    ) : (
                      searchHits.map((hit) => (
                        <tr
                          key={`${pathKey(hit.folderPath)}/${hit.entry.id}`}
                          className="border-b border-white/5"
                        >
                          <td className="max-w-[min(36vw,260px)] min-w-0 p-2">
                            <div className="flex min-w-0 items-center gap-2 font-medium text-white/90">
                              <span className="shrink-0">
                                <EntryIcon entry={hit.entry} />
                              </span>
                              <span className="min-w-0 truncate" title={hit.entry.name}>
                                {hit.entry.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-white/50">{formatPathDisplay(hit.folderPath)}</td>
                          <td className="p-2 text-right tabular-nums text-white/60">
                            {formatBytes(hit.entry.sizeBytes)}
                          </td>
                          <td className="p-2 text-white/50">{hit.entry.typeLabel ?? '—'}</td>
                          <td className="p-2 text-white/50">
                            {formatModified(hit.entry.modified)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <aside
                className={cn(
                  'shrink-0 overflow-y-auto border-r border-white/5 frost-glass-surface p-2 text-sm',
                  showFolderTree ? 'w-56' : 'w-44'
                )}
                aria-label="Navigation"
              >
                {showFolderTree ? (
                  <FolderTree
                    currentPath={leftPath}
                    onNavigate={navigateTo}
                    resolveTreeChildren={folderTreeResolveChildren}
                  />
                ) : null}
                {showFolderTree ? <div className="my-2 border-t border-white/10" /> : null}
                <details open className="group mb-2">
                  <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-wide text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="hover:text-slate-400">Quick Access</span>
                  </summary>
                  <div className="mt-1 flex flex-col gap-0.5 pl-0.5">
                    {QUICK_ACCESS.map(({ label, path }) =>
                      sidebarNavButton(label, path, pathsEqual(leftPath, path))
                    )}
                    {sidebarNavButton(
                      'Recycle Bin',
                      ['Recycle Bin'],
                      pathsEqual(leftPath, ['Recycle Bin'])
                    )}
                  </div>
                </details>

                <details open className="group mb-2">
                  <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-wide text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
                    This PC
                  </summary>
                  <div className="mt-1 flex flex-col gap-0.5 pl-0.5">
                    {sidebarNavButton('This PC', ['This PC'], pathsEqual(leftPath, ['This PC']))}
                    {sidebarNavButton(
                      'My Storage',
                      ['This PC', 'My Storage'],
                      pathsEqual(leftPath, ['This PC', 'My Storage'])
                    )}
                    {THIS_PC_PLACES.map(({ label, path }) =>
                      sidebarNavButton(label, path, pathsEqual(leftPath, path))
                    )}
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-wide text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
                    Network
                  </summary>
                  <div className="mt-1 flex flex-col gap-0.5 pl-0.5">
                    {sidebarNavButton('Network', ['Network'], pathsEqual(leftPath, ['Network']))}
                    {NETWORK_PLACES.map(({ label, path }) =>
                      sidebarNavButton(label, path, pathsEqual(leftPath, path))
                    )}
                  </div>
                </details>
              </aside>

              <div className="flex min-w-0 flex-1 divide-x divide-white/5">
                {renderPane(
                  'left',
                  history,
                  filteredEntries,
                  selectedLeft,
                  patchActiveTabHistory,
                  sortedEntries,
                  leftDrivePaneFooter
                )}
                {dualPane
                  ? renderPane(
                      'right',
                      rightHistory,
                      filteredRightEntries,
                      selectedRight,
                      patchRightHistory,
                      sortedRightEntries,
                      rightDrivePaneFooter
                    )
                  : null}
              </div>
            </div>
          )}
        </div>
        {toolbarInCloud ? (
          <FileExplorerUploadPanel
            open={uploadPanelOpen}
            onClose={() => setUploadPanelOpen(false)}
            baseSegments={uploadPanelBaseSegments}
            destinationLabel={uploadDestinationLabel}
            reducedMotion={reducedMotion}
            executeUploads={executeUploads}
          />
        ) : null}
      </div>

      <footer
        className="flex h-7 shrink-0 items-center border-t border-white/10 bg-black/30 px-3 text-[10px] text-white/50"
        role="status"
      >
        <span className="truncate">{statusLeft}</span>
      </footer>
    </div>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
        disabled
          ? 'cursor-not-allowed text-white/20'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
