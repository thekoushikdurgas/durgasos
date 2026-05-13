'use client';

import { useCallback, useEffect } from 'react';

/**
 * Registers global ⌘K / Ctrl+K to toggle the command palette.
 * Must be used under OSProvider (uses callback from parent that closes other overlays).
 */
export function useGlobalCommandPaletteShortcut(
  enabled: boolean,
  onToggle: () => void
) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (e.defaultPrevented) return;
      const isK = e.key === 'k' || e.key === 'K';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle();
      }
    },
    [enabled, onToggle]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, handler]);
}
