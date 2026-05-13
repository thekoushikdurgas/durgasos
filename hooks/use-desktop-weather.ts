'use client';

import { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@apollo/client/react';

import type { WeatherForecastQuery } from '@/graphql/generated/graphql';
import { WEATHER_FORECAST } from '@/lib/graphql-modules';
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
  const [params, setParams] = useState<Record<string, number> | undefined>(undefined);

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

  const q = useQuery<WeatherForecastQuery>(WEATHER_FORECAST, {
    variables: {
      params: params === undefined ? null : Object.keys(params).length > 0 ? params : null,
    },
    skip: params === undefined,
    pollInterval: POLL_MS,
    fetchPolicy: 'network-only',
  });

  const forecast = useMemo(() => {
    const raw = q.data?.weatherForecast;
    return parseWeatherForecastPayload(raw);
  }, [q.data]);

  return {
    coordsReady: params !== undefined,
    forecast,
    loading: q.loading,
    error: q.error ?? null,
    refetch: () => {
      void q.refetch();
    },
  };
}
