'use client';

import { Gamepad, Play, Volume2, VolumeX } from 'lucide-react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { TAB_LABELS } from '@/lib/roadrash-constants';
import { RoadRashHub } from '@/components/apps/roadrash/RoadRashHub';
import { RoadRashGameView } from '@/components/apps/roadrash/RoadRashGameView';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

export function RoadRashShell() {
  const {
    isPlaying,
    activeTab,
    isConnected,
    isMuted,
    setIsMuted,
    activeGamepad,
    selectedTrack,
    startGame,
  } = useRoadRash();

  const breadcrumb = isPlaying ? 'Racing' : TAB_LABELS[activeTab];

  return (
    <div className="rr-shell absolute inset-0 bg-[#0f172a] text-slate-100 overflow-hidden flex flex-col font-sans select-none border border-t-0 border-white/5 shadow-2xl">
      <LiquidGlassSurface
        variant="frost"
        withLiquidShell={false}
        className={`h-14 border-b border-white/5 flex items-center justify-between px-6 z-20 shrink-0 ${isPlaying ? 'rr-shell-header--racing' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Gamepad className="w-6 h-6 text-rose-500 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-widest bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent truncate">
              ROAD RASH: INDIAN STREETS
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider truncate">
              {breadcrumb}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50 shrink-0">
          {!isPlaying && activeTab === 'menu' && (
            <button
              type="button"
              onClick={() => startGame(selectedTrack, false)}
              className="rr-btn-arcade flex items-center gap-2 px-4 py-2 text-white text-xs z-50 relative"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden />
              Start Race
            </button>
          )}
          {activeGamepad && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Gamepad className="w-3.5 h-3.5" />
              Controller
            </span>
          )}
          <span className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}
              aria-hidden
            />
            {isConnected ? 'Server Linked' : 'Offline'}
          </span>
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/70 transition rr-sidebar-nav"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </LiquidGlassSurface>
      {!isPlaying ? (
        <div className="flex-1 flex overflow-hidden rr-parallax-bg">
          <RoadRashHub />
        </div>
      ) : (
        <RoadRashGameView />
      )}
    </div>
  );
}
