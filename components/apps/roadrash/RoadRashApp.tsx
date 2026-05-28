'use client';

import '@/app/roadrash-theme.css';
import { RoadRashProvider } from '@/contexts/roadrash-context';
import { RoadRashShell } from '@/components/apps/roadrash/RoadRashShell';

export function RoadRashApp() {
  return (
    <RoadRashProvider>
      <RoadRashShell />
    </RoadRashProvider>
  );
}
