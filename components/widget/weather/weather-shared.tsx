'use client';

import { useWeatherWidgetData } from '@/components/widget/WeatherWidgetProvider';

export function WeatherErrorBanner() {
  const { error } = useWeatherWidgetData();
  if (!error) return null;
  return (
    <div className="max-w-[min(100vw-2rem,320px)] rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs text-red-200/90">
      Weather unavailable{error.message ? `: ${error.message}` : ''}
    </div>
  );
}

export function WeatherEmptyState() {
  return (
    <div className="max-w-[min(100vw-2rem,320px)] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
      Could not read weather data.
    </div>
  );
}

export function WeatherHourlySkeleton() {
  return (
    <div className="h-24 w-full max-w-[min(100vw-2rem,320px)] animate-pulse rounded-2xl bg-white/10" />
  );
}

export function WeatherCurrentSkeleton() {
  return (
    <div className="h-28 w-full max-w-[min(100vw-2rem,320px)] animate-pulse rounded-2xl bg-white/10" />
  );
}

export function WeatherDailySkeleton() {
  return (
    <div className="h-36 w-full max-w-[min(100vw-2rem,320px)] animate-pulse rounded-2xl bg-white/10" />
  );
}

export function useWeatherWidgetState() {
  const { coordsReady, forecast, loading, error } = useWeatherWidgetData();
  const showSkeleton = !coordsReady || (loading && !forecast);
  return { forecast, error, showSkeleton };
}
