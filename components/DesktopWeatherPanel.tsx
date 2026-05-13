'use client';

import type { ComponentProps } from 'react';
import { Cloud, CloudRain, CloudSun, CloudSunRain, MapPin, Sun } from 'lucide-react';
import { motion } from 'motion/react';

import { LiquidGlassSurface } from '@/components/ui/liquid-glass';
import { useDesktopWeather } from '@/hooks/use-desktop-weather';
import { cn } from '@/lib/utils';
import type {
  WeatherDaily,
  WeatherForecastPayload,
  WeatherHourly,
} from '@/lib/weather-forecast-types';

type GlyphProps = Omit<ComponentProps<typeof Sun>, 'ref'>;

/** Stable component: maps WMO weather codes to Lucide icons (avoids dynamic component types during render). */
function WeatherCodeGlyph({ code, ...props }: GlyphProps & { code: number | null }) {
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

function formatHourLabel(iso: string): string {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso;
  }
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function WeatherStrip({ hourly }: { hourly: WeatherHourly[] }) {
  if (!hourly.length) return null;
  return (
    <div className="w-fit max-w-[min(100vw-2rem,320px)] overflow-x-auto rounded-2xl border border-white/10 shadow-lg [scrollbar-width:thin]">
      <LiquidGlassSurface variant="frost" className="bg-white/5 px-3 py-3 text-white">
        <div className="grid grid-cols-6 grid-rows-1 gap-[10px] px-1">
          {hourly.map((h) => {
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
  );
}

function CurrentCard({ data }: { data: WeatherForecastPayload }) {
  const { current, daily } = data;
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
    <div className="w-full max-w-[min(100vw-2rem,320px)] rounded-2xl border border-white/10 shadow-lg">
      <LiquidGlassSurface
        variant="liquid"
        className="bg-white/8 p-4 text-white"
        contentClassName="space-y-2"
      >
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
        {(data.timezoneAbbreviation || data.timezone) && (
          <div className="flex items-center gap-1.5 text-xs text-white/55">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            <span>
              {data.timezoneAbbreviation ?? ''}
              {data.timezoneAbbreviation && data.timezone ? ' · ' : ''}
              {data.timezone ?? ''}
            </span>
          </div>
        )}
      </LiquidGlassSurface>
    </div>
  );
}

function DailyCard({ daily }: { daily: WeatherDaily[] }) {
  const rows = daily.slice(0, 5);
  if (!rows.length) return null;
  return (
    <div className="w-full max-w-[min(100vw-2rem,320px)] rounded-2xl border border-white/10 shadow-lg">
      <LiquidGlassSurface variant="frost" className="bg-white/6 p-4 text-white">
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
                <div className="flex items-center gap-2 min-w-0">
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
  );
}

function SkeletonStack() {
  return (
    <div className="pointer-events-auto flex w-full max-w-[min(100vw-2rem,320px)] flex-col gap-3">
      <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-28 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-36 animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}

export function DesktopWeatherPanel() {
  const { coordsReady, forecast, loading, error } = useDesktopWeather();

  const showSkeleton = !coordsReady || (loading && !forecast);

  return (
    <motion.div
      className={cn('pointer-events-auto flex flex-col items-end gap-3')}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {error && (
        <div className="max-w-[min(100vw-2rem,320px)] rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-right text-xs text-red-200/90">
          Weather unavailable{error.message ? `: ${error.message}` : ''}
        </div>
      )}
      {showSkeleton && <SkeletonStack />}
      {!showSkeleton && forecast && (
        <>
          <WeatherStrip hourly={forecast.hourly} />
          <CurrentCard data={forecast} />
          <DailyCard daily={forecast.daily} />
        </>
      )}
      {!showSkeleton && !forecast && !error && (
        <div className="max-w-[min(100vw-2rem,320px)] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right text-xs text-white/60">
          Could not read weather data.
        </div>
      )}
    </motion.div>
  );
}
