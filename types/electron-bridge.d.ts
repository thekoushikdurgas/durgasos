/** Exposed from `electron/preload.cjs` via `contextBridge`. */
export interface ElectronBridge {
  platform: NodeJS.Platform;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridge;
  }
}

export {};
