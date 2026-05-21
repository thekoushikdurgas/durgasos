/** Exposed from `electron/preload.cjs` via `contextBridge`. */
export interface ElectronBridge {
  platform: NodeJS.Platform;
  openExternal: (url: string) => Promise<void>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridge;
  }
}

export {};
