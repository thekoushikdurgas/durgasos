'use client';

import { Play } from 'lucide-react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { TrackCard3D } from '@/components/apps/roadrash/ui/TrackCard3D';

export function CareerTab() {
  const { TRACKS, selectedTrack, setSelectedTrack, startGame } = useRoadRash();

  const handleRace = (trackId: string) => {
    startGame(trackId, false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-wide text-white/90">Career mode</h3>
          <p className="text-sm text-white/50 mt-1">
            Select a track. Dodge cows, outrun autos, collect bounty.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleRace(selectedTrack)}
          className="rr-btn-arcade flex items-center justify-center gap-2 px-6 py-3 text-white shrink-0"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden />
          Start Race
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TRACKS.map((t) => (
          <TrackCard3D
            key={t.id}
            track={t}
            selected={selectedTrack === t.id}
            onSelect={() => setSelectedTrack(t.id)}
            onRace={() => handleRace(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
