'use client';

import { useRoadRash } from '@/contexts/roadrash-context';
import { SpeedometerArc } from '@/components/apps/roadrash/hud/SpeedometerArc';
import { RoadRashProgress } from '@/components/apps/roadrash/ui/RoadRashProgress';
import { cn } from '@/lib/utils';

export function RoadRashHudOverlay() {
  const {
    hudSpeed,
    hudHealth,
    hudTimer,
    hudRank,
    hudProgress,
    raceCountdown,
    retreat,
    isTouchDevice,
    setKeyPressed,
    selectedTrack,
  } = useRoadRash();

  const speedKmh = Math.round(hudSpeed * 3.6);
  const healthLow = hudHealth < 35;
  const healthCritical = hudHealth < 15;

  return (
    <>
      {raceCountdown != null && (
        <div className="rr-countdown-overlay" aria-live="polite">
          <span className="rr-countdown-digit">{raceCountdown === 0 ? 'GO!' : raceCountdown}</span>
        </div>
      )}

      <div className="rr-hud-cockpit" aria-hidden={raceCountdown != null ? 'true' : 'false'}>
        <div className="rr-hud-top">
          <div className="rr-hud-speedo">
            <div className="rr-hud-speedo-label">Speed · {selectedTrack.toUpperCase()}</div>
            <SpeedometerArc speedKmh={speedKmh} size={148} />
          </div>
          <div className="rr-hud-stats">
            <div className="rr-hud-stat">
              <div className="rr-hud-stat-label">Time</div>
              <div className="rr-hud-stat-value rr-hud-stat-value--time">
                {hudTimer.toFixed(1)}s
              </div>
            </div>
            <div className="rr-hud-stat">
              <div className="rr-hud-stat-label">Rank</div>
              <div className="rr-hud-stat-value rr-hud-stat-value--rank">#{hudRank}</div>
            </div>
          </div>
        </div>

        <div className="rr-hud-bottom">
          <div className="rr-hud-bars">
            <div
              className={cn(
                'rr-hud-bar-panel',
                healthCritical && 'ring-2 ring-red-500/60 animate-pulse'
              )}
            >
              <RoadRashProgress
                label="Health"
                valueLabel={`${Math.round(hudHealth)}%`}
                value={Math.max(0, hudHealth)}
                max={100}
                className={
                  healthCritical
                    ? '[&>div]:from-red-600 [&>div]:to-red-800'
                    : healthLow
                      ? '[&>div]:from-amber-500 [&>div]:to-orange-600'
                      : '[&>div]:from-emerald-500 [&>div]:to-teal-600'
                }
              />
            </div>
            <div className="rr-hud-bar-panel">
              <RoadRashProgress
                label="Distance"
                valueLabel={`${Math.round(hudProgress * 100)}%`}
                value={hudProgress * 100}
                max={100}
                className="[&>div]:from-amber-500 [&>div]:to-rose-500"
              />
            </div>
          </div>
          <button type="button" className="rr-hud-retreat" onClick={retreat}>
            Retreat
          </button>
        </div>
      </div>

      {isTouchDevice && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div
            className="absolute left-0 top-0 bottom-24 w-[28%] pointer-events-auto rounded-r-3xl border border-white/10 bg-white/5 opacity-40"
            aria-label="Steer left"
            onTouchStart={() => setKeyPressed('ArrowLeft', true)}
            onTouchEnd={() => setKeyPressed('ArrowLeft', false)}
          />
          <div
            className="absolute right-0 top-0 bottom-24 w-[28%] pointer-events-auto rounded-l-3xl border border-white/10 bg-white/5 opacity-40"
            aria-label="Steer right"
            onTouchStart={() => setKeyPressed('ArrowRight', true)}
            onTouchEnd={() => setKeyPressed('ArrowRight', false)}
          />
          <button
            type="button"
            className="pointer-events-auto absolute bottom-8 left-6 w-20 h-20 rounded-full rr-btn-3d bg-emerald-500/40 border-2 border-emerald-400/50 text-xs font-bold"
            onTouchStart={() => setKeyPressed('ArrowUp', true)}
            onTouchEnd={() => setKeyPressed('ArrowUp', false)}
          >
            GAS
          </button>
          <button
            type="button"
            className="pointer-events-auto absolute bottom-8 right-24 w-20 h-20 rounded-full rr-btn-3d bg-amber-500/40 border-2 border-amber-400/50 text-xs font-bold"
            onTouchStart={() => setKeyPressed('ArrowDown', true)}
            onTouchEnd={() => setKeyPressed('ArrowDown', false)}
          >
            BRAKE
          </button>
        </div>
      )}
    </>
  );
}
