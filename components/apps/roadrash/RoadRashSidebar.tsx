'use client';

import {
  Award,
  Gamepad,
  Play,
  Settings as SettingsIcon,
  ShoppingCart,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { TAB_LABELS, type RoadRashTab } from '@/lib/roadrash-constants';
import { cn } from '@/lib/utils';

const NAV: { id: RoadRashTab; icon: typeof Play }[] = [
  { id: 'menu', icon: Play },
  { id: 'garage', icon: ShoppingCart },
  { id: 'multiplayer', icon: Users },
  { id: 'leaderboard', icon: Award },
  { id: 'social', icon: UserPlus },
  { id: 'settings', icon: SettingsIcon },
];

export function RoadRashSidebar() {
  const { activeTab, setActiveTab, profile, isConnected } = useRoadRash();

  return (
    <nav
      className="w-64 border-r border-white/5 bg-slate-950/40 flex flex-col gap-1 p-4 z-20"
      aria-label="Road Rash navigation"
    >
      {NAV.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          className={cn(
            'rr-sidebar-nav flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left',
            activeTab === id
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 rr-btn-3d'
              : 'hover:bg-white/5 text-white/75'
          )}
        >
          <Icon className="w-4 h-4" aria-hidden />
          {TAB_LABELS[id]}
        </button>
      ))}
      <div className="mt-auto rr-panel-3d rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-sm">
            {profile.player_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-white/50">Driver</div>
            <div className="text-sm font-semibold truncate">{profile.player_name}</div>
          </div>
        </div>
        <div className="flex justify-between text-xs border-t border-white/5 pt-2">
          <span className="text-white/40">Bounty</span>
          <span className="font-bold text-amber-400">₹{profile.money}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Bike</span>
          <span className="font-semibold px-2 py-0.5 rounded bg-white/5 truncate max-w-[120px]">
            {profile.current_bike}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'
            )}
          />
          {isConnected ? 'Server linked' : 'Offline'}
        </div>
      </div>
    </nav>
  );
}
