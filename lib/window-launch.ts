import type { PathSegments } from '@/lib/file-explorer-mock';

/** Optional data passed when opening a window (e.g. from File Explorer “Open with”). */
export type LaunchPayload = {
  pathSegments?: PathSegments;
  fileName?: string;
  initialUrl?: string;
};
