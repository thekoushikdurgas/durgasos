/** Desktop windows must stay below shell overlays (launcher, sidebars, command palette). */
export const MAX_WINDOW_Z_INDEX = 80;

/** Fixed shell layers (above windows, below menubar dropdowns at 2000 and welcome at 10000). */
export const SHELL_Z = {
  launcherBackdrop: 1850,
  launcherPanel: 1860,
  widgetSidebar: 1870,
  notificationSidebar: 1870,
  commandPalette: 1880,
} as const;

export function clampWindowZIndex(z: number): number {
  return Math.min(Math.max(1, z), MAX_WINDOW_Z_INDEX);
}
