'use client';

import { createContext, useContext } from 'react';

import { useDesktopWeather, type UseDesktopWeatherResult } from '@/hooks/use-desktop-weather';

const WeatherWidgetContext = createContext<UseDesktopWeatherResult | null>(null);

export function WeatherWidgetProvider({ children }: { children: React.ReactNode }) {
  const value = useDesktopWeather();
  return <WeatherWidgetContext.Provider value={value}>{children}</WeatherWidgetContext.Provider>;
}

export function useWeatherWidgetData(): UseDesktopWeatherResult {
  const ctx = useContext(WeatherWidgetContext);
  if (!ctx) {
    throw new Error('useWeatherWidgetData must be used within WeatherWidgetProvider');
  }
  return ctx;
}
