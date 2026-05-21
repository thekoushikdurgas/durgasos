export type PanelTab = 'notifications' | 'system';

import {
  SIDEBAR_WIDTH_CLOSED,
  SIDEBAR_WIDTH_OPEN,
  sidebarLabelSpring,
  sidebarWidthSpring,
} from '@/lib/motion/spring-presets';

/** Numeric spring targets for sidebar shell (react-motion). */
export const sidebarMotion = {
  open: {
    width: SIDEBAR_WIDTH_OPEN,
    opacity: 1,
    x: 0,
  },
  closed: {
    width: SIDEBAR_WIDTH_CLOSED,
    opacity: 1,
    x: 0,
  },
  exit: {
    width: SIDEBAR_WIDTH_CLOSED,
    opacity: 0,
    x: 320,
  },
  initial: {
    width: SIDEBAR_WIDTH_CLOSED,
    opacity: 0,
    x: 320,
  },
} as const;

export const labelMotion = {
  open: { x: 0, opacity: 1 },
  closed: { x: 20, opacity: 0 },
} as const;

export const listItemMotion = {
  open: { opacity: 1, x: 0 },
  closed: { opacity: 0, x: 12 },
} as const;

export { sidebarWidthSpring, sidebarLabelSpring };
