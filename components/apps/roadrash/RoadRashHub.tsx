'use client';

import { useRoadRash } from '@/contexts/roadrash-context';
import { TAB_LABELS } from '@/lib/roadrash-constants';
import { RoadRashSidebar } from '@/components/apps/roadrash/RoadRashSidebar';
import { RaceResultPanel } from '@/components/apps/roadrash/RaceResultPanel';
import { CareerTab } from '@/components/apps/roadrash/tabs/CareerTab';
import { GarageTab } from '@/components/apps/roadrash/tabs/GarageTab';
import { MultiplayerTab } from '@/components/apps/roadrash/tabs/MultiplayerTab';
import { LeaderboardTab } from '@/components/apps/roadrash/tabs/LeaderboardTab';
import { SocialTab } from '@/components/apps/roadrash/tabs/SocialTab';
import { SettingsTab } from '@/components/apps/roadrash/tabs/SettingsTab';

export function RoadRashHub() {
  const { activeTab } = useRoadRash();

  return (
    <div className="flex-1 flex overflow-hidden">
      <RoadRashSidebar />
      <main className="rr-hub-main flex-1 overflow-y-auto p-8 relative z-10">
        <div className="rr-menu-hero mb-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-rose-400/80 mb-2">
            {TAB_LABELS[activeTab]}
          </p>
          <h2 className="rr-arcade-title">INDIAN STREETS</h2>
          <p className="text-sm text-white/50 mt-3 max-w-xl">
            Arcade racing across Mumbai, Delhi &amp; Goa — inspired by classic Road Rash.
          </p>
        </div>
        <RaceResultPanel />
        {activeTab === 'menu' && <CareerTab />}
        {activeTab === 'garage' && <GarageTab />}
        {activeTab === 'multiplayer' && <MultiplayerTab />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        {activeTab === 'social' && <SocialTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
