'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { WeatherForecastQuery } from '@/graphql/generated/graphql';
import { CACHE_TTL_MS, cachedFetch } from '@/lib/api-client';
import { buildBackendAuthHeaders } from '@/lib/backend-http';
import { getGraphqlHttpUrl } from '@/lib/backend-url';
import {
  parseWeatherForecastPayload,
  type WeatherForecastPayload,
} from '@/lib/weather-forecast-types';

const POLL_MS = 15 * 60 * 1000;

type Coords = { latitude: number; longitude: number };

function parsePublicDefaultCoords(): Coords | null {
  const latRaw = process.env.NEXT_PUBLIC_WEATHER_DEFAULT_LAT?.trim();
  const lonRaw = process.env.NEXT_PUBLIC_WEATHER_DEFAULT_LON?.trim();
  if (!latRaw || !lonRaw) return null;
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export type UseDesktopWeatherResult = {
  /** false only while resolving geolocation / defaults before first query */
  coordsReady: boolean;
  forecast: WeatherForecastPayload | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useDesktopWeather(): UseDesktopWeatherResult {
  const [params, setParams] = useState<Record<string, number> | Record<string, never> | undefined>(
    undefined
  );
  const [rawForecast, setRawForecast] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const envDefaults = parsePublicDefaultCoords();

    const finish = (next: Record<string, number> | Record<string, never>) => {
      if (!cancelled) setParams(next);
    };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      finish(envDefaults ?? {});
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finish({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        finish(envDefaults ?? {});
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const cacheKey = useMemo(() => {
    if (params === undefined) return 'weather:pending';
    const q =
      Object.keys(params).length > 0 ? `?params=${encodeURIComponent(JSON.stringify(params))}` : '';
    return `weather${q}`;
  }, [params]);

  const load = useCallback(
    async (force = false) => {
      if (params === undefined) return;
      setLoading(true);
      try {
        const paramsVar =
          params && typeof params === 'object' && Object.keys(params).length > 0 ? params : null;
        const json = await cachedFetch<{ data?: WeatherForecastQuery }>(getGraphqlHttpUrl(), {
          cacheKey,
          ttlMs: CACHE_TTL_MS.weather,
          force,
          init: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...buildBackendAuthHeaders(),
            },
            body: JSON.stringify({
              query: `query WeatherForecast($params: JSON) { weatherForecast(params: $params) }`,
              variables: { params: paramsVar },
            }),
          },
        });
        setRawForecast(json.data?.weatherForecast);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
      }
    },
    [params, cacheKey]
  );

  useEffect(() => {
    if (params === undefined) return;
    const kick = window.setTimeout(() => {
      void load(false);
    }, 0);
    const id = window.setInterval(() => void load(false), POLL_MS);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [params, load]);

  const forecast = useMemo(() => parseWeatherForecastPayload(rawForecast), [rawForecast]);

  return {
    coordsReady: params !== undefined,
    forecast,
    loading,
    error,
    refetch: () => {
      void load(true);
    },
  };
}
