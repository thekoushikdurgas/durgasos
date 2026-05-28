'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRoadRash } from '@/contexts/roadrash-context';
import { RoadRashInput } from '@/components/apps/roadrash/ui/RoadRashInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Radio } from '@/components/ui/radio';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';

export function SettingsTab() {
  const {
    profile,
    setProfile,
    lowEndMode,
    setLowEndMode,
    fixedQualityTier,
    setFixedQualityTier,
    isMuted,
    setIsMuted,
  } = useRoadRash();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (name: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setProfile({ ...profile, player_name: name });
      }, 400);
    },
    [profile, setProfile]
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">PREFERENCES</h2>
        <p className="text-sm text-white/50">Graphics, audio, and driver profile.</p>
      </div>
      <LiquidGlassSurface
        variant="frost"
        className="rr-panel-3d rounded-3xl p-6 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="rr-nickname" className="text-xs text-white/40 uppercase">
            Driver Nickname
          </label>
          <RoadRashInput
            id="rr-nickname"
            value={profile.player_name}
            onChange={(e) => scheduleSave(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox checked={lowEndMode} onChange={(e) => setLowEndMode(e.target.checked)} />
          <div>
            <div className="text-sm font-semibold">Low-End Hardware Mode</div>
            <div className="text-xs text-white/40">
              Tier 0: 50% resolution, short draw distance.
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox checked={isMuted} onChange={(e) => setIsMuted(e.target.checked)} />
          <div>
            <div className="text-sm font-semibold">Mute Audio</div>
            <div className="text-xs text-white/40">Engine, SFX, and ambient layers.</div>
          </div>
        </label>
        <div className="border-t border-white/5 pt-4">
          <div className="text-sm font-semibold mb-3">Graphics Quality Override</div>
          <div className="flex flex-col gap-2">
            {[
              { v: null, label: 'Auto (dynamic FPS tier)' },
              { v: 0, label: 'Low' },
              { v: 1, label: 'Medium' },
              { v: 2, label: 'High' },
            ].map((opt) => (
              <label key={String(opt.v)} className="flex items-center gap-3 cursor-pointer">
                <Radio
                  name="quality-tier"
                  checked={fixedQualityTier === opt.v}
                  onChange={() => setFixedQualityTier(opt.v)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </LiquidGlassSurface>
    </div>
  );
}
