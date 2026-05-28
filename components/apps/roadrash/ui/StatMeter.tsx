'use client';

import { RoadRashProgress } from '@/components/apps/roadrash/ui/RoadRashProgress';

type StatMeterProps = {
  label: string;
  value: number;
  max: number;
};

export function StatMeter({ label, value, max }: StatMeterProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <RoadRashProgress
      label={label}
      valueLabel={`${pct}%`}
      value={value}
      max={max}
      aria-label={`${label} ${pct} percent`}
    />
  );
}
