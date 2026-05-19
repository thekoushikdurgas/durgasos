import { extensionFromFileName } from '@/lib/app-file-associations';
import type { FsIconKey, MockFsEntry, PathSegments } from '@/lib/file-explorer-mock';
import { isUserStoragePath } from '@/lib/file-explorer-mock';

export const STORAGE_BUCKET_UPLOADS = 'uploads';

/** Guard GraphQL body size; tune if your proxy allows more. */
export const STORAGE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Join cloud-relative prefix segments with a relative file path (e.g. `Photos/a.jpg` from
 * folder picker). Rejects empty, `.`, `..`, and suspicious segments.
 */
export function joinStorageUploadRelativePath(
  prefixSegments: string[],
  relativePath: string
): string | null {
  const norm = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const relParts = norm.split('/').filter(Boolean);
  const all = [...prefixSegments, ...relParts];
  for (const p of all) {
    if (!p || p === '.' || p === '..' || p.includes('..')) return null;
  }
  return all.join('/');
}

/** Base64 payload for `storage.upload` (no data: prefix). */
export async function fileToBase64ForUpload(
  file: File,
  maxBytes: number = STORAGE_UPLOAD_MAX_BYTES
): Promise<string> {
  if (file.size > maxBytes) {
    throw new Error(
      `“${file.name}” is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB in this build).`
    );
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error ?? new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

export type StorageListFileRow = {
  name: string;
  path: string;
  size: number;
  /** From Python / JSON snake_case */
  is_directory?: boolean;
  /** Some serializers use camelCase */
  isDirectory?: boolean;
};

export type StorageListPayload = {
  success?: boolean;
  files?: StorageListFileRow[];
};

/**
 * GraphQL `JSON` fields may deserialize as objects or as JSON strings.
 * Without this, `files` can be missing and the UI may keep a stale listing.
 */
export function coerceStorageListPayload(raw: unknown): StorageListPayload | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw) as unknown;
      return typeof v === 'object' && v != null ? (v as StorageListPayload) : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') return raw as StorageListPayload;
  return undefined;
}

export type ExplorerEntry = MockFsEntry & {
  storage?: { bucket_type: string; file_path: string };
  /** When set, navigation uses this segment instead of `name` (e.g. Google Drive file ids). */
  explorerPathSegment?: string;
  googleDrive?: { fileId: string; mimeType?: string; webViewLink?: string | null };
};

export function storageListParamsForPath(
  segments: PathSegments,
  userSub: string | undefined
): Record<string, unknown> | null {
  if (!isUserStoragePath(segments) || !userSub) return null;
  const rel = segments.slice(2);
  if (rel.length === 0) return { bucket_type: STORAGE_BUCKET_UPLOADS };
  return { bucket_type: STORAGE_BUCKET_UPLOADS, folder_path: [userSub, ...rel].join('/') };
}

/** GraphQL `storageList.folder_path` for a folder under My Storage (includes `userId/` prefix). */
export function storageFolderPathFromExplorerPath(
  folderSegments: PathSegments,
  userSub: string | undefined
): string | null {
  if (!isUserStoragePath(folderSegments) || !userSub) return null;
  const rel = folderSegments.slice(2);
  return [userSub, ...rel].join('/');
}

function storageListRowIsDirectory(row: StorageListFileRow): boolean {
  return row.is_directory === true || row.isDirectory === true;
}

function storageFileIconKey(fileName: string): FsIconKey {
  const ext = extensionFromFileName(fileName);
  if (
    [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'svg',
      'bmp',
      'ico',
      'avif',
      'heic',
      'tif',
      'tiff',
      'jxl',
    ].includes(ext)
  ) {
    return 'image';
  }
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'wmv'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus', 'wma'].includes(ext)) {
    return 'music';
  }
  return 'file';
}

export function mapStorageRowToExplorerEntry(row: StorageListFileRow): ExplorerEntry {
  const isDir = storageListRowIsDirectory(row);
  return {
    id: `st:${row.path}`,
    name: row.name,
    kind: isDir ? 'folder' : 'file',
    icon: isDir ? 'folder' : storageFileIconKey(row.name),
    sizeBytes: isDir ? undefined : row.size,
    typeLabel: isDir ? 'Folder' : 'File',
    storage: isDir ? undefined : { bucket_type: STORAGE_BUCKET_UPLOADS, file_path: row.path },
  };
}
