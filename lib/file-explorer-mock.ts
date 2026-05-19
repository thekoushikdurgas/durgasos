export type FsKind = 'folder' | 'file' | 'drive';

export type FsIconKey =
  | 'folder'
  | 'file'
  | 'download'
  | 'image'
  | 'drive'
  | 'music'
  | 'video'
  | 'trash'
  | 'network'
  | 'desktop'
  | 'pc';

export interface MockFsEntry {
  id: string;
  name: string;
  /** When set, tree navigation appends this instead of `name` (e.g. Google user id vs display name). */
  pathSegment?: string;
  kind: FsKind;
  icon: FsIconKey;
  sizeBytes?: number;
  modified?: string;
  hidden?: boolean;
  typeLabel?: string;
}

export type PathSegments = readonly string[];

export function pathKey(segments: PathSegments): string {
  return segments.join('/');
}

export interface NavHistory {
  past: PathSegments[];
  current: PathSegments;
  future: PathSegments[];
}

export function initialHistory(root: PathSegments = ['This PC']): NavHistory {
  return { past: [], current: [...root], future: [] };
}

function segmentsEqual(a: PathSegments, b: PathSegments): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

export function goTo(history: NavHistory, path: PathSegments): NavHistory {
  if (segmentsEqual(history.current, path)) return history;
  return {
    past: [...history.past, history.current],
    current: [...path],
    future: [],
  };
}

export function back(history: NavHistory): NavHistory | null {
  if (history.past.length === 0) return null;
  const prev = history.past[history.past.length - 1]!;
  const newPast = history.past.slice(0, -1);
  return {
    past: newPast,
    current: prev,
    future: [history.current, ...history.future],
  };
}

export function forward(history: NavHistory): NavHistory | null {
  if (history.future.length === 0) return null;
  const next = history.future[0]!;
  return {
    past: [...history.past, history.current],
    current: next,
    future: history.future.slice(1),
  };
}

export function parentPath(segments: PathSegments): PathSegments | null {
  if (segments.length <= 1) return null;
  return segments.slice(0, -1);
}

/** Keys match pathKey(segments) for each directory. */
const MOCK_TREE: Record<string, MockFsEntry[]> = {
  'This PC': [
    {
      id: 'pc-my-storage',
      name: 'My Storage',
      kind: 'folder',
      icon: 'drive',
      modified: '2025-05-16T12:00:00.000Z',
      typeLabel: 'Cloud storage',
    },
    {
      id: 'pc-google-drive',
      name: 'Google Drive',
      kind: 'folder',
      icon: 'drive',
      modified: '2025-05-16T12:00:00.000Z',
      typeLabel: 'Google Drive',
    },
    {
      id: 'pc-c',
      name: 'Local Disk (C:)',
      kind: 'drive',
      icon: 'drive',
      sizeBytes: 256_000_000_000,
      modified: '2024-01-10T08:00:00.000Z',
      typeLabel: 'Local Disk',
    },
    {
      id: 'pc-d',
      name: 'Data (D:)',
      kind: 'drive',
      icon: 'drive',
      sizeBytes: 512_000_000_000,
      modified: '2024-01-10T08:00:00.000Z',
      typeLabel: 'Local Disk',
    },
    {
      id: 'pc-docs',
      name: 'Documents',
      kind: 'folder',
      icon: 'folder',
      modified: '2025-03-01T12:00:00.000Z',
      typeLabel: 'Folder',
    },
    {
      id: 'pc-down',
      name: 'Downloads',
      kind: 'folder',
      icon: 'download',
      modified: '2025-05-08T09:30:00.000Z',
      typeLabel: 'Folder',
    },
    {
      id: 'pc-pic',
      name: 'Pictures',
      kind: 'folder',
      icon: 'image',
      modified: '2025-02-14T16:20:00.000Z',
      typeLabel: 'Folder',
    },
    {
      id: 'pc-mus',
      name: 'Music',
      kind: 'folder',
      icon: 'music',
      modified: '2024-11-02T10:00:00.000Z',
      typeLabel: 'Folder',
    },
    {
      id: 'pc-vid',
      name: 'Videos',
      kind: 'folder',
      icon: 'video',
      modified: '2025-04-20T18:45:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  /** Listing under My Storage is cloud-backed in FileExplorer; tree stays empty here. */
  'This PC/My Storage': [],
  'This PC/Local Disk (C:)': [
    {
      id: 'c-win',
      name: 'Windows',
      kind: 'folder',
      icon: 'folder',
      modified: '2023-06-01T00:00:00.000Z',
      typeLabel: 'Folder',
    },
    {
      id: 'c-prog',
      name: 'Program Files',
      kind: 'folder',
      icon: 'folder',
      modified: '2023-06-01T00:00:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  'This PC/Local Disk (C:)/Windows': [],
  'This PC/Local Disk (C:)/Program Files': [],
  'This PC/Data (D:)': [
    {
      id: 'd-backup',
      name: 'Backup',
      kind: 'folder',
      icon: 'folder',
      modified: '2025-04-01T07:00:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  'This PC/Data (D:)/Backup': [],
  'This PC/Documents': [
    {
      id: 'doc-work',
      name: 'Work',
      kind: 'folder',
      icon: 'folder',
      modified: '2025-04-10T13:00:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  'This PC/Documents/Work': [],
  'This PC/Downloads': [],
  'This PC/Pictures': [
    {
      id: 'pic1',
      name: 'Screenshots',
      kind: 'folder',
      icon: 'folder',
      modified: '2025-02-01T12:00:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  'This PC/Pictures/Screenshots': [],
  'This PC/Music': [],
  'This PC/Videos': [],
  'This PC/Desktop': [],
  Network: [
    {
      id: 'net-local',
      name: 'localhost',
      kind: 'folder',
      icon: 'network',
      modified: '2025-01-01T00:00:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  'Network/localhost': [
    {
      id: 'nf1',
      name: 'Shared',
      kind: 'folder',
      icon: 'folder',
      modified: '2025-01-15T10:00:00.000Z',
      typeLabel: 'Folder',
    },
  ],
  'Network/localhost/Shared': [],
  'Recycle Bin': [],
  /** Children come from linked Google accounts in FileExplorer (GraphQL). */
  'This PC/Google Drive': [],
};

/** Cloud-backed folder under This PC — listing is driven by storage API in FileExplorer. */
export function isUserStoragePath(segments: PathSegments): boolean {
  return segments.length >= 2 && segments[0] === 'This PC' && segments[1] === 'My Storage';
}

/** Google Drive branch — listing is driven by Drive API in FileExplorer. */
export function isGoogleDrivePath(segments: PathSegments): boolean {
  return segments.length >= 2 && segments[0] === 'This PC' && segments[1] === 'Google Drive';
}

export function pathExists(segments: PathSegments): boolean {
  if (isUserStoragePath(segments)) return true;
  if (isGoogleDrivePath(segments)) return true;
  const key = pathKey(segments);
  return Object.prototype.hasOwnProperty.call(MOCK_TREE, key);
}

export function listDirectory(segments: PathSegments): MockFsEntry[] {
  const key = pathKey(segments);
  return MOCK_TREE[key] ?? [];
}

export function parseAddressInput(raw: string): PathSegments | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/\s*>\s*/g, '/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return parts;
}

export function formatPathDisplay(segments: PathSegments): string {
  return segments.join(' > ');
}

export function defaultTabLabel(segments: PathSegments): string {
  if (segments.length === 0) return 'Files';
  return segments[segments.length - 1] ?? 'Files';
}

/** Simple glob: * matches any substring; case-insensitive. */
export function globMatchesFileName(fileName: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (!p) return true;
  const n = fileName.toLowerCase();
  if (!p.includes('*')) return n.includes(p);
  const parts = p.split('*').filter(Boolean);
  if (parts.length === 0) return true;
  let idx = 0;
  for (const part of parts) {
    const j = n.indexOf(part, idx);
    if (j < 0) return false;
    idx = j + part.length;
  }
  return true;
}

export type SearchHit = {
  entry: MockFsEntry;
  folderPath: PathSegments;
};

function isUnderScope(folder: PathSegments, scope: PathSegments): boolean {
  if (scope.length > folder.length) return false;
  for (let i = 0; i < scope.length; i++) {
    if (folder[i] !== scope[i]) return false;
  }
  return true;
}

/**
 * Depth-first walk of MOCK_TREE: every file under `scope` (inclusive of files in scope folder).
 */
export function enumerateFilesUnder(
  scope: PathSegments,
  opts: {
    namePattern: string;
    phrase?: string;
    includeHidden: boolean;
  }
): SearchHit[] {
  const hits: SearchHit[] = [];
  const dirs = Object.keys(MOCK_TREE).sort();

  for (const dirKey of dirs) {
    const folderPath = dirKey.split('/') as unknown as PathSegments;
    if (!isUnderScope(folderPath, scope)) continue;

    const entries = MOCK_TREE[dirKey] ?? [];
    for (const entry of entries) {
      if (entry.kind !== 'file') continue;
      if (!opts.includeHidden && entry.hidden) continue;
      if (!globMatchesFileName(entry.name, opts.namePattern)) continue;
      if (opts.phrase?.trim()) {
        // Stub: pretend phrase matches if filename contains phrase
        if (!entry.name.toLowerCase().includes(opts.phrase.trim().toLowerCase())) continue;
      }
      hits.push({ entry, folderPath });
    }
  }
  return hits;
}
