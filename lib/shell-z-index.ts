/** Desktop windows must stay below shell overlays (launcher, sidebars, command palette). */
export const MAX_WINDOW_Z_INDEX = 80;

/** Desktop widgets must stay below shell overlays (uncapped bringToFront used to paint over launcher). */
export const MAX_DESKTOP_WIDGET_Z_INDEX = 48;

/** Fixed shell layers (above windows/widgets, below menubar dropdowns at 2000 and welcome at 10000). */
export const SHELL_Z = {
  launcherBackdrop: 9500,
  launcherPanel: 9510,
  widgetSidebar: 9520,
  notificationSidebar: 9520,
  commandPalette: 9530,
} as const;

export function clampWidgetZIndex(z: number): number {
  return Math.min(Math.max(1, z), MAX_DESKTOP_WIDGET_Z_INDEX);
}

export function clampWindowZIndex(z: number): number {
  return Math.min(Math.max(1, z), MAX_WINDOW_Z_INDEX);
}
