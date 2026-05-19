import { extensionFromFileName } from '@/lib/app-file-associations';
import type { FsIconKey, PathSegments } from '@/lib/file-explorer-mock';
import { isGoogleDrivePath } from '@/lib/file-explorer-mock';
import type { ExplorerEntry } from '@/lib/file-explorer-storage';

export type DriveListFileRow = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string | number;
  modifiedTime?: string;
  webViewLink?: string | null;
};

export type DriveListPayload = {
  success?: boolean;
  files?: DriveListFileRow[];
  nextPageToken?: string | null;
};

export function coerceGoogleDriveListPayload(raw: unknown): DriveListPayload | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw) as unknown;
      return typeof v === 'object' && v != null ? (v as DriveListPayload) : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') return raw as DriveListPayload;
  return undefined;
}

/** `This PC > Google Drive` — pick a linked account (no Drive API list yet). */
export function isGoogleDriveAccountPickerPath(segments: PathSegments): boolean {
  return isGoogleDrivePath(segments) && segments.length === 2;
}

/** `This PC > Google Drive > …` — list via Drive API (root or subfolder). */
export function isGoogleDriveFolderListPath(segments: PathSegments): boolean {
  return isGoogleDrivePath(segments) && segments.length >= 3;
}

export function parseGoogleDriveUserId(segments: PathSegments): string | null {
  if (!isGoogleDriveFolderListPath(segments)) return null;
  const uid = segments[2];
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

/**
 * Drive `files.list` query for the current explorer folder.
 * Returns `null` when not on a Drive API-backed folder.
 */
export function driveListQueryForExplorerPath(segments: PathSegments): string | null {
  if (!isGoogleDriveFolderListPath(segments)) return null;
  if (segments.length === 3) return "'root' in parents and trashed = false";
  const parentId = segments[segments.length - 1];
  if (typeof parentId !== 'string' || !parentId) return null;
  return `'${parentId.replace(/'/g, "\\'")}' in parents and trashed = false`;
}

export function buildDriveListParams(opts: {
  accessToken: string;
  q: string;
  pageToken?: string | null;
  pageSize?: number;
}): Record<string, unknown> {
  const page_size = opts.pageSize ?? 50;
  const params: Record<string, unknown> = {
    access_token: opts.accessToken,
    q: opts.q,
    page_size,
  };
  if (opts.pageToken) params.page_token = opts.pageToken;
  return params;
}

function driveFileIconKey(fileName: string, mime: string): FsIconKey {
  if (mime === 'application/vnd.google-apps.folder') return 'folder';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'music';
  return extensionFromFileName(fileName) ? 'file' : 'file';
}

function driveRowSizeBytes(row: DriveListFileRow): number | undefined {
  const s = row.size;
  if (s == null) return undefined;
  if (typeof s === 'number' && Number.isFinite(s)) return s;
  if (typeof s === 'string' && s.trim()) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function mapDriveFileToExplorerEntry(row: DriveListFileRow): ExplorerEntry {
  const id =
    typeof row.id === 'string' && row.id
      ? row.id
      : `gd-unknown-${Math.random().toString(36).slice(2)}`;
  const name = typeof row.name === 'string' && row.name ? row.name : id;
  const mime = typeof row.mimeType === 'string' ? row.mimeType : '';
  const isFolder = mime === 'application/vnd.google-apps.folder';
  const webViewLink = typeof row.webViewLink === 'string' ? row.webViewLink : null;
  const modified = typeof row.modifiedTime === 'string' ? row.modifiedTime : undefined;
  if (isFolder) {
    return {
      id: `gd-folder:${id}`,
      name,
      pathSegment: id,
      kind: 'folder',
      icon: 'folder',
      modified,
      typeLabel: 'Folder',
      explorerPathSegment: id,
    };
  }
  return {
    id: `gd-file:${id}`,
    name,
    kind: 'file',
    icon: driveFileIconKey(name, mime),
    sizeBytes: driveRowSizeBytes(row),
    modified,
    typeLabel: mime ? (mime.split('/').pop() ?? 'File') : 'File',
    googleDrive: { fileId: id, mimeType: mime, webViewLink },
  };
}

export function linkedAccountToExplorerEntry(acc: {
  googleUserId: string;
  email: string;
  displayName?: string | null;
}): ExplorerEntry {
  const label = acc.displayName?.trim() || acc.email || acc.googleUserId;
  return {
    id: `gd-account:${acc.googleUserId}`,
    name: label,
    pathSegment: acc.googleUserId,
    kind: 'folder',
    icon: 'drive',
    modified: undefined,
    typeLabel: 'Google account',
    explorerPathSegment: acc.googleUserId,
  };
}
