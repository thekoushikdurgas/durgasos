'use client';

import { ShieldAlert } from 'lucide-react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { medalEmoji } from '@/lib/roadrash-engine';
import { RoadRashButton } from '@/components/apps/roadrash/ui/RoadRashButton';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

export function RaceResultPanel() {
  const { gameResult, setGameResult } = useRoadRash();
  if (!gameResult) return null;

  return (
    <LiquidGlassSurface
      variant="frost"
      className="rr-panel-3d mb-6 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4"
      role="dialog"
      aria-label="Race results"
    >
      <div>
        <h3 className="text-emerald-400 font-bold text-lg mb-1">Race Finished!</h3>
        <p className="text-xs text-white/60">
          Finished <span className="font-bold text-white">#{gameResult.rank}</span> in{' '}
          <span className="font-bold text-white">{gameResult.time.toFixed(2)}s</span>
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-white/40">Bounty Earned</div>
          <div className="text-xl font-black text-amber-400">₹{gameResult.reward}</div>
        </div>
        {gameResult.medal && (
          <span className="text-3xl" title={gameResult.medal ?? undefined}>
            {medalEmoji(gameResult.medal)}
          </span>
        )}
        {gameResult.cheated && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" /> Flagged
          </span>
        )}
        <RoadRashButton size="sm" variant="outline" onClick={() => setGameResult(null)}>
          Dismiss
        </RoadRashButton>
      </div>
    </LiquidGlassSurface>
  );
}
