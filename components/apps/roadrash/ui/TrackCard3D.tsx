'use client';

import { Play } from 'lucide-react';
import type { TrackDefinition } from '@/lib/roadrash-constants';
import { cn } from '@/lib/utils';

type TrackCard3DProps = {
  track: TrackDefinition;
  selected: boolean;
  onSelect: () => void;
  onRace: () => void;
};

export function TrackCard3D({ track, selected, onSelect, onRace }: TrackCard3DProps) {
  return (
    <article
      className={cn(
        'rr-card-3d rr-panel-3d rounded-3xl p-6 flex flex-col gap-4',
        selected && 'rr-card-selected border-rose-500/40'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="text-left rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        aria-pressed={selected ? 'true' : 'false'}
        aria-label={`Select track ${track.name}`}
      >
        <div
          className="h-24 rounded-2xl border border-white/10 mb-1 w-full"
          style={{ background: track.previewGradient }}
          aria-hidden
        />
        <div className="flex items-center justify-between mb-1.5 mt-3">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">
            {track.difficulty}
          </span>
          <span className="text-xs text-white/40">Distance: {track.distance}m</span>
        </div>
        <h3 className="text-lg font-bold">{track.name}</h3>
        <p className="text-xs text-white/50 min-h-[32px] mt-2">{track.theme}</p>
      </button>
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div>
          <div className="text-[10px] text-white/40 uppercase">Prize Money</div>
          <div className="text-base font-black text-amber-400">₹{track.baseReward}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRace();
          }}
          className="rr-btn-arcade inline-flex items-center gap-2 px-4 py-2 text-xs"
        >
          Race <Play className="w-3 h-3 fill-current" aria-hidden />
        </button>
      </div>
    </article>
  );
}
