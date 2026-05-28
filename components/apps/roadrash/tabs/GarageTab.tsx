'use client';

import { useState } from 'react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { RoadRashButton } from '@/components/apps/roadrash/ui/RoadRashButton';
import { Radio } from '@/components/ui/radio';
import { StatMeter } from '@/components/apps/roadrash/ui/StatMeter';
import { cn } from '@/lib/utils';

const STAT_MAX = { maxSpeed: 320, accel: 45, handling: 100, durability: 150 };

export function GarageTab() {
  const { profile, BIKES_REGISTRY, buyBike } = useRoadRash();
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">GARAGE & MOTORCYCLES</h2>
        <p className="text-sm text-white/50">
          Equip bikes with radio select. Purchase upgrades with career bounty (₹{profile.money}).
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(BIKES_REGISTRY).map(([key, bike]) => {
          const owned = profile.unlocked_bikes.includes(key);
          const isActive = profile.current_bike === key;
          const canAfford = profile.money >= bike.price;
          return (
            <div
              key={key}
              className={cn(
                'rr-panel-3d rounded-3xl p-6 flex flex-col gap-4',
                isActive && 'border border-rose-500/40 bg-rose-500/10'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Radio
                    name="equip-bike"
                    checked={isActive}
                    onChange={() => buyBike(key)}
                    aria-label={`Equip ${bike.name}`}
                  />
                  <div>
                    <h3 className="text-lg font-bold">{bike.name}</h3>
                    <p className="text-xs text-white/50 mt-1">{bike.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-400">
                  {owned ? 'OWNED' : `₹${bike.price}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatMeter label="Speed" value={bike.maxSpeed} max={STAT_MAX.maxSpeed} />
                <StatMeter label="Accel" value={bike.accel} max={STAT_MAX.accel} />
                <StatMeter label="Handling" value={bike.handling} max={STAT_MAX.handling} />
                <StatMeter label="Durability" value={bike.durability} max={STAT_MAX.durability} />
              </div>
              {!owned && (
                <RoadRashButton
                  disabled={!canAfford}
                  variant={canAfford ? 'default' : 'secondary'}
                  className="w-full"
                  onClick={() => setConfirmBuy(key)}
                >
                  {canAfford ? 'PURCHASE' : 'INSUFFICIENT FUNDS'}
                </RoadRashButton>
              )}
              {confirmBuy === key && (
                <div className="flex gap-2">
                  <RoadRashButton
                    size="sm"
                    className="flex-1 bg-emerald-600"
                    onClick={() => {
                      buyBike(key);
                      setConfirmBuy(null);
                    }}
                  >
                    Confirm ₹{bike.price}
                  </RoadRashButton>
                  <RoadRashButton
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmBuy(null)}
                  >
                    Cancel
                  </RoadRashButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
