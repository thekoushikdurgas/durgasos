'use client';

import { SpringBox } from '@/components/motion/SpringBox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { formatHourLabel, WeatherCodeGlyph } from '@/components/widget/weather/weather-glyphs';
import {
  useWeatherWidgetState,
  WeatherEmptyState,
  WeatherErrorBanner,
  WeatherHourlySkeleton,
} from '@/components/widget/weather/weather-shared';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';

export function WeatherHourlyWidget() {
  const { forecast, error, showSkeleton } = useWeatherWidgetState();
  const enterStyle = useReducedMotionStyle({ opacity: 1, y: 0 }, overlaySpring);

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
      {showSkeleton && <WeatherHourlySkeleton />}
      {!showSkeleton && forecast && forecast.hourly.length > 0 && (
        <div className="w-full min-w-0 max-w-[min(100vw-2rem,320px)] overflow-x-auto rounded-2xl border border-white/10 shadow-lg [scrollbar-width:thin]">
          <LiquidGlassSurface variant="frost" className="w-full bg-white/5 px-3 py-3 text-white">
            <div className="grid w-fit grid-cols-4 grid-rows-2 gap-x-[44px] gap-y-[10px] px-[5px]">
              {forecast.hourly.map((h) => {
                const t = h.tempF != null ? `${Math.round(h.tempF)}°` : '—';
                return (
                  <div
                    key={h.time}
                    className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-xs"
                  >
                    <span className="text-white/70">{formatHourLabel(h.time)}</span>
                    <WeatherCodeGlyph
                      code={h.weatherCode}
                      className="h-5 w-5 shrink-0 text-white/90"
                      aria-hidden
                    />
                    <span className="font-medium tabular-nums">{t}</span>
                  </div>
                );
              })}
            </div>
          </LiquidGlassSurface>
        </div>
      )}
      {!showSkeleton && !forecast && !error && <WeatherEmptyState />}
    </SpringBox>
  );
}
