'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

export type ThemePreferencesValue = {
  prefersReducedMotion: boolean;
};

const ThemePreferencesContext = createContext<ThemePreferencesValue | null>(null);

/** Optional provider for future runtime liquid-glass toggles; motion preference is always available via `useThemePreferences`. */
export function ThemePreferencesProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const value = useMemo(() => ({ prefersReducedMotion }), [prefersReducedMotion]);
  return (
    <ThemePreferencesContext.Provider value={value}>{children}</ThemePreferencesContext.Provider>
  );
}

export function useThemePreferences(): ThemePreferencesValue {
  const ctx = useContext(ThemePreferencesContext);
  const prefersReducedMotion = usePrefersReducedMotion();
  return ctx ?? { prefersReducedMotion };
}
