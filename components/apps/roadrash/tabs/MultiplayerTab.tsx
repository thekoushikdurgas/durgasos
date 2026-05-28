'use client';

import { Users } from 'lucide-react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { RoadRashButton } from '@/components/apps/roadrash/ui/RoadRashButton';
import { RoadRashProgress } from '@/components/apps/roadrash/ui/RoadRashProgress';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { TRACKS } from '@/lib/roadrash-constants';
import { cn } from '@/lib/utils';

export function MultiplayerTab() {
  const {
    matchStatus,
    joinMatchmaker,
    matchNeedsReady,
    opponentName,
    opponentBike,
    confirmMatchReady,
    selectedTrack,
    setSelectedTrack,
    profile,
    isConnected,
  } = useRoadRash();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">COMPETITIVE LOBBY</h2>
        <p className="text-sm text-white/50">
          Skill-based matchmaking with ready-check before the green light.
        </p>
      </div>
      <LiquidGlassSurface
        variant="frost"
        className="rr-panel-3d rounded-3xl p-8 flex flex-col items-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
          <Users className="w-8 h-8" />
        </div>
        {matchStatus === 'idle' && (
          <>
            <p className="text-sm text-white/60 text-center">
              Queue for {profile.player_name} on{' '}
              {TRACKS.find((t) => t.id === selectedTrack)?.name ?? selectedTrack}.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrack(t.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold rr-btn-3d',
                    selectedTrack === t.id ? 'bg-rose-500 text-white' : 'bg-white/5'
                  )}
                >
                  {t.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <RoadRashButton
              disabled={!isConnected}
              title={!isConnected ? 'Connect to server first' : undefined}
              onClick={joinMatchmaker}
              className="px-8"
            >
              FIND MATCH
            </RoadRashButton>
          </>
        )}
        {matchStatus === 'searching' && (
          <>
            <p className="text-amber-400 font-bold animate-pulse">Searching for opponent…</p>
            <RoadRashProgress
              value={50}
              max={100}
              className="w-full max-w-xs"
              aria-label="Searching"
            />
            <RoadRashButton variant="outline" onClick={joinMatchmaker}>
              Cancel Search
            </RoadRashButton>
          </>
        )}
        {matchStatus === 'matched' && (
          <>
            <p className="text-emerald-400 font-bold text-lg">MATCH FOUND</p>
            <div className="rr-panel-3d rounded-2xl p-4 w-full text-center">
              <div className="text-xs text-white/40 uppercase">Opponent</div>
              <div className="text-xl font-black">{opponentName}</div>
              <div className="text-sm text-white/50 mt-1">Bike: {opponentBike}</div>
            </div>
            {matchNeedsReady ? (
              <RoadRashButton className="bg-emerald-600" onClick={confirmMatchReady}>
                READY UP
              </RoadRashButton>
            ) : (
              <p className="text-sm text-white/50">Starting race…</p>
            )}
          </>
        )}
      </LiquidGlassSurface>
      <div className="text-xs text-white/30 text-center">
        Flow: idle → searching → matched → ready → race
      </div>
    </div>
  );
}
