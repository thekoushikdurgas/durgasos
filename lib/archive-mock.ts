export type ArchiveEntry = {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  sizeBytes: number;
  packedBytes: number;
  modified: string;
  attributes: string;
  method: string;
  encrypted?: boolean;
};

/** Demo archive tree keyed by path segments joined with `/` inside archive root `demo.zip`. */
export const DEMO_ARCHIVE_ROOT = 'demo.zip';

export const ARCHIVE_MOCK_TREE: Record<string, ArchiveEntry[]> = {
  [DEMO_ARCHIVE_ROOT]: [
    {
      id: 'z-src',
      name: 'src',
      kind: 'folder',
      sizeBytes: 0,
      packedBytes: 0,
      modified: '2025-05-01T10:00:00.000Z',
      attributes: 'D',
      method: 'Store',
    },
    {
      id: 'z-readme',
      name: 'README.md',
      kind: 'file',
      sizeBytes: 1_024,
      packedBytes: 412,
      modified: '2025-05-01T10:05:00.000Z',
      attributes: 'A',
      method: 'Deflate',
    },
  ],
  [`${DEMO_ARCHIVE_ROOT}/src`]: [
    {
      id: 'z-main',
      name: 'main.ts',
      kind: 'file',
      sizeBytes: 2_048,
      packedBytes: 890,
      modified: '2025-05-01T10:10:00.000Z',
      attributes: 'A',
      method: 'LZMA:25',
    },
  ],
};

export function listArchiveDir(pathInsideArchive: string): ArchiveEntry[] {
  return ARCHIVE_MOCK_TREE[pathInsideArchive] ?? [];
}
