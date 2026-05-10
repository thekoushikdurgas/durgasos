import type { MockFsEntry } from '@/lib/file-explorer-mock';

export type RemoteTreeNode = {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  children?: RemoteTreeNode[];
  sizeBytes?: number;
  modified?: string;
  typeLabel?: string;
};

export const MOCK_REMOTE_TREE: RemoteTreeNode = {
  id: 'r-root',
  name: '/',
  kind: 'folder',
  children: [
    {
      id: 'r-home',
      name: 'home',
      kind: 'folder',
      children: [
        {
          id: 'r-user',
          name: 'foxlet',
          kind: 'folder',
          children: [
            {
              id: 'r-readme',
              name: 'README.md',
              kind: 'file',
              sizeBytes: 2_048,
              modified: '2025-05-01T12:00:00.000Z',
              typeLabel: 'Markdown',
            },
            {
              id: 'r-data',
              name: 'data.csv',
              kind: 'file',
              sizeBytes: 16_384,
              modified: '2025-05-08T09:00:00.000Z',
              typeLabel: 'CSV',
            },
          ],
        },
      ],
    },
  ],
};

export type TransferQueueItem = {
  id: string;
  localLabel: string;
  remoteLabel: string;
  direction: 'upload' | 'download';
  sizeBytes: number;
  progress: number;
  status: 'queued' | 'active' | 'done' | 'failed';
};

export const MOCK_TRANSFER_QUEUE: TransferQueueItem[] = [];

export function remotePathToNodes(path: string[]): RemoteTreeNode | null {
  if (path.length === 0) return MOCK_REMOTE_TREE;
  let cur: RemoteTreeNode | undefined = MOCK_REMOTE_TREE;
  for (const seg of path) {
    if (!cur?.children) return null;
    cur = cur.children.find((c) => c.name === seg);
    if (!cur) return null;
  }
  return cur ?? null;
}

export function remoteChildren(path: string[]): RemoteTreeNode[] {
  const n = remotePathToNodes(path);
  return n?.children ?? [];
}

export function toMockEntries(nodes: RemoteTreeNode[]): MockFsEntry[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    kind: n.kind,
    icon: n.kind === 'folder' ? 'folder' : 'file',
    sizeBytes: n.sizeBytes,
    modified: n.modified,
    typeLabel: n.typeLabel ?? (n.kind === 'folder' ? 'Folder' : 'File'),
  }));
}
