'use client';

import type { Transition } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

/** Matches AppShell / Search stacked layout breakpoint */
export const APP_RAIL_STACKED_MQ = '(max-width: 980px)';

export const RAIL_WIDTH_COLLAPSED = '3.05rem';

export const railTransition: Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.2,
};

export type AppRailLayout = {
  layoutStacked: boolean;
  pinnedOpen: boolean;
  setPinnedOpen: Dispatch<SetStateAction<boolean>>;
  showLabels: boolean;
  railCollapsed: boolean;
  railWidth: string;
  railAsideHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  railDataProps: Record<string, string | boolean | undefined>;
};

/**
 * Collapsible left app rail: hover expand, pin, full width when layout is stacked (≤980px).
 * Aligns with SessionSidebar + SearchConsolePage behavior (docs/uiux/sidebar.md).
 */
export function useAppRailLayout(openWidth: string): AppRailLayout {
  const [layoutStacked, setLayoutStacked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(APP_RAIL_STACKED_MQ);
    const apply = () => setLayoutStacked(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const alwaysExpandRail = layoutStacked;
  const effectiveOpen = alwaysExpandRail || pinnedOpen || hovered;
  const showLabels = effectiveOpen;
  const railCollapsed = !alwaysExpandRail && !effectiveOpen;

  const railWidth = useMemo(
    () => (layoutStacked ? '100%' : effectiveOpen ? openWidth : RAIL_WIDTH_COLLAPSED),
    [layoutStacked, effectiveOpen, openWidth]
  );

  const onMouseEnter = useCallback(() => {
    if (!layoutStacked) setHovered(true);
  }, [layoutStacked]);

  const onMouseLeave = useCallback(() => {
    if (!layoutStacked) setHovered(false);
  }, [layoutStacked]);

  return {
    layoutStacked,
    pinnedOpen,
    setPinnedOpen,
    showLabels,
    railCollapsed,
    railWidth,
    railAsideHandlers: { onMouseEnter, onMouseLeave },
    railDataProps: railCollapsed ? { 'data-rail-collapsed': true } : {},
  };
}
