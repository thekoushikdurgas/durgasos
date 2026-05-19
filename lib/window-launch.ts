import type { PathSegments } from '@/lib/file-explorer-mock';

/** Object storage reference (uploads bucket paths are usually `userId/...`). */
export type LaunchStorageRef = {
  bucket_type: string;
  file_path: string;
};

/** Open a cloud folder in Void IDE (recursive text files under `folder_path`). */
export type VoidIdeStorageFolderLaunch = {
  bucket_type: string;
  /** Same as GraphQL `storageList` `folder_path` (e.g. `userId/Documents`). */
  folder_path: string;
  /** Folder name for UI (optional). */
  rootLabel?: string;
};

/** Optional data passed when opening a window (e.g. from File Explorer “Open with”). */
export type LaunchPayload = {
  pathSegments?: PathSegments;
  fileName?: string;
  initialUrl?: string;
  /** Open a file from GraphQL `storageList` / signed URL flow. */
  storage?: LaunchStorageRef;
  /** Open My Storage folder as a virtual workspace in Void IDE. */
  voidIdeStorageFolder?: VoidIdeStorageFolderLaunch;
  /** When true, skip installed-app guard (e.g. Apps Manager launching after install). */
  bypassInstallCheck?: boolean;
  /** When opening Settings, select this sidebar tab (e.g. `Accounts`). */
  settingsTab?: string;
};

/** Value provided to window content: launch payload plus shell-injected `windowId`. */
export type WindowLaunchContextValue = Partial<LaunchPayload> & {
  windowId: string;
};
