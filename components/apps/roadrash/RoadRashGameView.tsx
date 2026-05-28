'use client';

import { useRoadRash } from '@/contexts/roadrash-context';
import { RoadRashHudOverlay } from '@/components/apps/roadrash/hud/RoadRashHudOverlay';

export function RoadRashGameView() {
  const { canvasRef } = useRoadRash();

  return (
    <div className="rr-game-viewport">
      <canvas
        ref={canvasRef}
        width={1024}
        height={576}
        layoutsubtree=""
        aria-label="Road Rash race track"
      >
        <div id="rr-hud-container" className="absolute inset-0 pointer-events-none w-full h-full">
          <RoadRashHudOverlay />
        </div>
      </canvas>
      <div className="rr-game-vignette" aria-hidden />
    </div>
  );
}
