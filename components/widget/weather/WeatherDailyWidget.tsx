'use client';

import { SpringBox } from '@/components/motion/SpringBox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { formatDayLabel, WeatherCodeGlyph } from '@/components/widget/weather/weather-glyphs';
import {
  useWeatherWidgetState,
  WeatherEmptyState,
  WeatherErrorBanner,
  WeatherDailySkeleton,
} from '@/components/widget/weather/weather-shared';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';

export function WeatherDailyWidget() {
  const { forecast, error, showSkeleton } = useWeatherWidgetState();
  const enterStyle = useReducedMotionStyle({ opacity: 1, y: 0 }, overlaySpring);

  const rows = forecast?.daily.slice(0, 5) ?? [];

  return (
    <SpringBox
      className="pointer-events-auto"
      defaultStyle={{ opacity: 0, y: 8 }}
      style={enterStyle}
      mapStyle={(s) => ({
        opacity: s.opacity,
        transform: `translate3d(0, ${s.y ?? 0}px, 0)`,
      })}
    >
      {error && <WeatherErrorBanner />}
      {showSkeleton && <WeatherDailySkeleton />}
      {!showSkeleton && forecast && rows.length > 0 && (
        <div className="h-full w-full min-w-0 max-w-[min(100vw-2rem,320px)] rounded-2xl border border-white/10 shadow-lg">
          <LiquidGlassSurface variant="frost" className="h-full bg-white/6 p-4 text-white">
            <div className="flex flex-col gap-3">
              {rows.map((d) => {
                const span =
                  d.maxF != null && d.minF != null
                    ? `${Math.round(d.maxF)}° / ${Math.round(d.minF)}°`
                    : d.maxC != null && d.minC != null
                      ? `${Math.round(d.maxC)}° / ${Math.round(d.minC)}°`
                      : '—';
                return (
                  <div key={d.date} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <WeatherCodeGlyph
                        code={d.weatherCode}
                        className="h-5 w-5 shrink-0 text-white/85"
                        aria-hidden
                      />
                      <span className="truncate font-medium">{formatDayLabel(d.date)}</span>
                    </div>
                    <span className="shrink-0 tabular-nums text-white/85">{span}</span>
                  </div>
                );
              })}
            </div>
          </LiquidGlassSurface>
        </div>
      )}
      {!showSkeleton && !forecast && !error && <WeatherEmptyState />}
      {!showSkeleton && forecast && rows.length === 0 && !error && <WeatherEmptyState />}
    </SpringBox>
  );
}
