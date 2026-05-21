import { presets } from 'react-motion';

/** Sidebar width spring (open/close). */
export const sidebarWidthSpring = { ...presets.stiff, precision: 0.5 };

/** Label slide-in when sidebar expands. */
export const sidebarLabelSpring = { ...presets.gentle, precision: 0.01 };

/** List row stagger. */
export const listItemSpring = presets.noWobble;

/** Overlay / modal enter. */
export const overlaySpring = presets.gentle;

/** Tab indicator pill. */
export const tabIndicatorSpring = { stiffness: 300, damping: 30, precision: 0.5 };

/** Progress / stat bars. */
export const meterSpring = { ...presets.noWobble, precision: 0.1 };

/** Dock icon magnify. */
export const dockSpring = presets.wobbly;

/** Draggable snap. */
export const dragSnapSpring = presets.stiff;

/** UI press feedback. */
export const pressSpring = { stiffness: 400, damping: 28, precision: 0.01 };

export { presets };

export const SIDEBAR_WIDTH_OPEN = 320;
export const SIDEBAR_WIDTH_CLOSED = 48.8;
