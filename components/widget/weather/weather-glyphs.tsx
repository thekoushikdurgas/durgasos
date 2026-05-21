'use client';

import type { ComponentProps } from 'react';
import { Cloud, CloudRain, CloudSun, CloudSunRain, Sun } from 'lucide-react';

type GlyphProps = Omit<ComponentProps<typeof Sun>, 'ref'>;

/** Stable component: maps WMO weather codes to Lucide icons. */
export function WeatherCodeGlyph({ code, ...props }: GlyphProps & { code: number | null }) {
  if (code === null) return <Cloud {...props} />;
  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code === 2) return <CloudSun {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code >= 51 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSunRain {...props} />;
  if (code >= 80 && code <= 82) return <CloudRain {...props} />;
  if (code >= 85 && code <= 86) return <CloudSunRain {...props} />;
  if (code >= 95) return <CloudRain {...props} />;
  if (code >= 45 && code <= 48) return <Cloud {...props} />;
  return <CloudSun {...props} />;
}

export function formatHourLabel(iso: string): string {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso;
  }
}

export function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
