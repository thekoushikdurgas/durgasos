'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
  Search,
  Table2,
  Trash2,
  Globe,
  X,
  PanelLeft,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
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
  goTo,
  initialHistory,
  listDirectory,
  parentPath,
  parseAddressInput,
  pathExists,
  pathKey,
} from '@/lib/file-explorer-mock';
import { FolderTree } from '@/components/apps/FolderTree';
import { useOS } from '@/components/os-context';
import type { AppId } from '@/lib/apps';

type ViewMode = 'grid' | 'list' | 'details';
type ExplorerMode = 'browse' | 'search';

type ExplorerTab = {
  id: string;
  history: NavHistory;
};

type SortKey = 'name' | 'size' | 'type' | 'modified';

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
  { label: 'Local Disk (C:)', path: ['This PC', 'Local Disk (C:)'] },
  { label: 'Data (D:)', path: ['This PC', 'Data (D:)'] },
];

const NETWORK_PLACES: { label: string; path: PathSegments }[] = [
  { label: 'localhost', path: ['Network', 'localhost'] },
];

const SEARCH_SCOPES: { label: string; path: PathSegments }[] = [
  { label: 'This PC', path: ['This PC'] },
  { label: 'Documents', path: ['This PC', 'Documents'] },
  { label: 'Downloads', path: ['This PC', 'Downloads'] },
  { label: 'Local Disk (C:)', path: ['This PC', 'Local Disk (C:)'] },
  { label: 'Network', path: ['Network'] },
];

function newTabId(): string {
  return `fe-tab-${Math.random().toString(36).slice(2, 10)}`;
}

function pathsEqual(a: PathSegments, b: PathSegments): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
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
  if (segments[0] === 'Network') return 'Network location';
  if (segments[0] === 'Recycle Bin') return 'Recycle Bin';
  if (segments.length === 1 && segments[0] === 'This PC') return 'Virtual folder';
  if (segments[1]?.includes('Disk')) return 'Local disk';
  return 'Folder';
}

function fileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function EntryIcon({ entry }: { entry: MockFsEntry }) {
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
  const reducedMotion = usePrefersReducedMotion();
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>('browse');
  const [showFolderTree, setShowFolderTree] = useState(false);

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
  const [rightHistory, setRightHistory] = useState<NavHistory>(() =>
    initialHistory(['This PC', 'Documents'])
  );

  const leftPath = history.current;
  const rightPath = rightHistory.current;

  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());

  const [refreshNonce, setRefreshNonce] = useState(0);

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

  const onRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const onAddressSubmit = useCallback(() => {
    const parsed = parseAddressInput(addressInputValue.trim());
    if (!parsed) {
      setAddressError('Enter a path such as This PC > Documents');
      return;
    }
    if (!pathExists(parsed)) {
      setAddressError('That location is not available in this demo.');
      return;
    }
    setAddressError(null);
    setAddressFocused(false);
    patchActiveTabHistory((h) => goTo(h, parsed));
  }, [addressInputValue, patchActiveTabHistory]);

  const entries = useMemo(() => {
    void refreshNonce;
    return listDirectory(leftPath);
  }, [leftPath, refreshNonce]);

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

  const rightEntries = useMemo(() => {
    void refreshNonce;
    return listDirectory(rightPath);
  }, [rightPath, refreshNonce]);

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

  const openEntry = useCallback(
    (entry: MockFsEntry, side: 'left' | 'right') => {
      if (entry.kind === 'file') return;
      const base = side === 'left' ? leftPath : rightPath;
      const nextPath = [...base, entry.name] as PathSegments;
      if (!pathExists(nextPath)) return;
      if (side === 'left') {
        patchActiveTabHistory((h) => goTo(h, nextPath));
      } else {
        patchRightHistory((rh) => goTo(rh, nextPath));
      }
    },
    [leftPath, patchActiveTabHistory, patchRightHistory, rightPath]
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
    const hits = enumerateFilesUnder(searchScope, {
      namePattern: searchNamePattern || '*',
      phrase: searchPhrase,
      includeHidden: searchIncludeHidden,
    });
    setSearchHits(hits);
    setSearchRan(true);
  }, [searchIncludeHidden, searchNamePattern, searchPhrase, searchScope]);

  const openWith = useCallback(
    (app: AppId, entry: MockFsEntry, side: 'left' | 'right') => {
      const base = side === 'left' ? leftPath : rightPath;
      openApp(app, { pathSegments: [...base], fileName: entry.name });
    },
    [leftPath, openApp, rightPath]
  );

  const headerSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const renderFileContextMenu = (
    entry: MockFsEntry,
    side: 'left' | 'right',
    trigger: React.ReactNode
  ) => {
    const ext = fileExt(entry.name);
    return (
      <ContextMenu key={entry.id}>
        <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
        <ContextMenuContent className="border-white/10 bg-slate-900/95 text-slate-100">
          {entry.kind === 'file' && (ext === 'mp4' || ext === 'mp3') ? (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => openWith('player', entry, side)}
            >
              Open with Player
            </ContextMenuItem>
          ) : null}
          {entry.kind === 'file' && ext === 'zip' ? (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => openWith('archiver', entry, side)}
            >
              Open with Archiver
            </ContextMenuItem>
          ) : null}
          {entry.kind === 'file' && (ext === 'txt' || ext === 'md') ? (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => openWith('docs', entry, side)}
            >
              Open with Docs
            </ContextMenuItem>
          ) : null}
          {entry.kind === 'file' && (ext === 'html' || ext === 'htm') ? (
            <ContextMenuItem
              className="focus:bg-white/10"
              onSelect={() => openWith('browser', entry, side)}
            >
              Open with Browser
            </ContextMenuItem>
          ) : null}
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
    list: MockFsEntry[],
    selected: Set<string>,
    patchHistory: (patch: (prev: NavHistory) => NavHistory) => void,
    sortedList: MockFsEntry[]
  ) => (
    <div
      className={cn('flex min-h-0 min-w-0 flex-1 flex-col', side === 'right' && 'bg-white/[0.03]')}
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
                if (!pathExists(prefix)) return;
                patchHistory((prev) => goTo(prev, prefix));
              }}
            >
              {segment}
            </button>
          </div>
        ))}
      </nav>

      {viewMode === 'details' ? (
        <div className="min-h-0 flex-1 overflow-auto">
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
                    This folder is empty.
                  </td>
                </tr>
              ) : (
                sortedList.map((entry) => {
                  const isFolderLike = entry.kind !== 'file';
                  return renderFileContextMenu(
                    entry,
                    side,
                    <tr
                      key={entry.id}
                      className={cn(
                        'cursor-pointer border-b border-white/5 hover:bg-white/5',
                        selected.has(entry.id) ? 'bg-blue-500/20' : ''
                      )}
                      onClick={(e) => toggleSelect(entry.id, e, side)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        if (isFolderLike) openEntry(entry, side);
                      }}
                    >
                      <td className="p-2">
                        <EntryIcon entry={entry} />
                      </td>
                      <td className="max-w-[200px] truncate p-2 font-medium text-white/90">
                        {entry.name}
                      </td>
                      <td className="max-w-[72px] truncate p-2 text-right tabular-nums text-white/70">
                        {formatBytes(entry.sizeBytes)}
                      </td>
                      <td className="p-2 text-white/50">{entry.typeLabel ?? '—'}</td>
                      <td className="p-2 text-white/50">{formatModified(entry.modified)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin',
            viewMode === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3 auto-rows-max'
              : 'flex flex-col gap-1'
          )}
          role="list"
        >
          {list.length === 0 ? (
            <div
              className="col-span-full flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-white/40"
              role="status"
            >
              <Folder className="h-10 w-10 opacity-30" strokeWidth={1} />
              <p>This folder is empty.</p>
              {deferredSearch.trim() ? (
                <p className="text-xs text-white/30">Try clearing the search filter.</p>
              ) : null}
            </div>
          ) : (
            list.map((entry) => {
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
                      ? 'flex-col justify-center p-3 text-center'
                      : 'w-full flex-row p-2',
                    selected.has(entry.id)
                      ? 'bg-blue-500/25 ring-1 ring-blue-400/40'
                      : 'bg-transparent hover:bg-white/10'
                  )}
                  onClick={(e) => toggleSelect(entry.id, e, side)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (isFolderLike) openEntry(entry, side);
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
                      'min-w-0 text-xs text-white',
                      viewMode === 'grid' && 'line-clamp-2 leading-tight'
                    )}
                  >
                    {entry.name}
                  </span>
                  {viewMode === 'list' && (
                    <span className="ml-auto shrink-0 text-[10px] text-white/35">
                      {entry.typeLabel ??
                        (entry.kind === 'file'
                          ? 'File'
                          : entry.kind === 'drive'
                            ? 'Drive'
                            : 'Folder')}
                    </span>
                  )}
                </button>
              );
              return entry.kind === 'file' ? renderFileContextMenu(entry, side, inner) : inner;
            })
          )}
        </div>
      )}
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

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-900/90 text-slate-200">
      <div
        className="flex h-9 shrink-0 items-stretch gap-0 border-b border-white/10 frost-glass-surface px-1"
        role="tablist"
        aria-label="Folder tabs"
      >
        {tabs.map((tab) => {
          const label = defaultTabLabel(tab.history.current);
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={cn(
                'group relative flex min-w-0 max-w-[11rem] items-center border-b-2',
                isActive ? 'border-blue-400 bg-white/10' : 'border-transparent hover:bg-white/5'
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-xs text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/50"
                onClick={() => activateTab(tab.id)}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400/90" strokeWidth={1.5} />
                <span className="truncate">{label}</span>
              </button>
              <button
                type="button"
                className={cn(
                  'mr-1 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                  tabs.length > 1
                    ? 'opacity-0 group-hover:opacity-100'
                    : 'opacity-0 pointer-events-none'
                )}
                aria-label={`Close ${label}`}
                onClick={(e) => closeTab(tab.id, e)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="flex w-8 shrink-0 items-center justify-center text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
          aria-label="New tab"
          onClick={addTab}
        >
          <Plus className="h-4 w-4" />
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
          <IconButton label="Refresh" onClick={onRefresh} icon={RotateCw} />
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
                <button
                  type="button"
                  className={cn(
                    'rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                    viewMode === 'grid'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  )}
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                    viewMode === 'list'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  )}
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                    viewMode === 'details'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  )}
                  aria-pressed={viewMode === 'details'}
                  onClick={() => setViewMode('details')}
                >
                  <Table2 className="h-4 w-4" />
                </button>
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
              <label className="mb-1 block text-white/50">Look in</label>
              <select
                className="mb-3 w-full rounded-md border border-white/10 bg-black/30 py-1.5 text-white"
                value={pathKey(searchScope)}
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
                        <td className="flex items-center gap-2 p-2 font-medium text-white/90">
                          <EntryIcon entry={hit.entry} />
                          {hit.entry.name}
                        </td>
                        <td className="p-2 text-white/50">{formatPathDisplay(hit.folderPath)}</td>
                        <td className="p-2 text-right tabular-nums text-white/60">
                          {formatBytes(hit.entry.sizeBytes)}
                        </td>
                        <td className="p-2 text-white/50">{hit.entry.typeLabel ?? '—'}</td>
                        <td className="p-2 text-white/50">{formatModified(hit.entry.modified)}</td>
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
                <FolderTree currentPath={leftPath} onNavigate={navigateTo} />
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
                sortedEntries
              )}
              {dualPane
                ? renderPane(
                    'right',
                    rightHistory,
                    filteredRightEntries,
                    selectedRight,
                    patchRightHistory,
                    sortedRightEntries
                  )
                : null}
            </div>
          </div>
        )}
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
