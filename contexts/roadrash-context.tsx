'use client';

import React, { createContext, useContext } from 'react';
import { useRoadRashGameCore } from '@/hooks/use-roadrash-game-core';

export type RoadRashContextValue = ReturnType<typeof useRoadRashGameCore>;

const RoadRashContext = createContext<RoadRashContextValue | null>(null);

export function RoadRashProvider({ children }: { children: React.ReactNode }) {
  const value = useRoadRashGameCore();
  return <RoadRashContext.Provider value={value}>{children}</RoadRashContext.Provider>;
}

export function useRoadRash(): RoadRashContextValue {
  const ctx = useContext(RoadRashContext);
  if (!ctx) throw new Error('useRoadRash must be used within RoadRashProvider');
  return ctx;
}
