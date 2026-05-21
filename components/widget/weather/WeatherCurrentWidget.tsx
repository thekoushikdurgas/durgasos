'use client';

import { MapPin } from 'lucide-react';

import { SpringBox } from '@/components/motion/SpringBox';
import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { WeatherCodeGlyph } from '@/components/widget/weather/weather-glyphs';
import {
  useWeatherWidgetState,
  WeatherEmptyState,
  WeatherErrorBanner,
  WeatherCurrentSkeleton,
} from '@/components/widget/weather/weather-shared';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';

export function WeatherCurrentWidget() {
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
      {showSkeleton && <WeatherCurrentSkeleton />}
      {!showSkeleton && forecast && (
        <div className="h-full w-full min-w-0 max-w-[min(100vw-2rem,320px)] rounded-2xl border border-white/10 shadow-lg">
          <LiquidGlassSurface
            variant="liquid"
            className="h-full bg-white/8 p-4 text-white"
            contentClassName="space-y-2"
          >
            {(() => {
              const { current, daily } = forecast;
              const today = daily[0];
              const hiLo =
                today != null &&
                today.maxF != null &&
                today.minF != null &&
                Number.isFinite(today.maxF) &&
                Number.isFinite(today.minF)
                  ? `${Math.round(today.maxF)}° / ${Math.round(today.minF)}°`
                  : null;

              const main =
                current.tempF != null && Number.isFinite(current.tempF)
                  ? `${Math.round(current.tempF)}`
                  : current.tempC != null && Number.isFinite(current.tempC)
                    ? `${Math.round(current.tempC)}`
                    : '—';
              const unit = current.tempF != null && Number.isFinite(current.tempF) ? '°F' : '°C';

              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-semibold tabular-nums leading-none tracking-tight">
                          {main}
                        </span>
                        <span className="text-lg font-medium text-white/80">{unit}</span>
                      </div>
                      {current.tempC != null && unit === '°F' && (
                        <p className="text-sm text-white/60">{Math.round(current.tempC)}°C</p>
                      )}
                      <p className="text-base text-white/90">{current.summary}</p>
                      {hiLo && <p className="text-sm text-white/70">Today {hiLo}</p>}
                    </div>
                    <WeatherCodeGlyph
                      code={current.weatherCode}
                      className="h-14 w-14 shrink-0 text-amber-200/90 drop-shadow"
                      aria-hidden
                    />
                  </div>
                  {(forecast.timezoneAbbreviation || forecast.timezone) && (
                    <div className="flex items-center gap-1.5 text-xs text-white/55">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        {forecast.timezoneAbbreviation ?? ''}
                        {forecast.timezoneAbbreviation && forecast.timezone ? ' · ' : ''}
                        {forecast.timezone ?? ''}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </LiquidGlassSurface>
        </div>
      )}
      {!showSkeleton && !forecast && !error && <WeatherEmptyState />}
    </SpringBox>
  );
}
