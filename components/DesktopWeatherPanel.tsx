'use client';

import { WeatherWidgetProvider } from '@/components/widget/WeatherWidgetProvider';
import { WeatherCurrentWidget } from '@/components/widget/weather/WeatherCurrentWidget';
import { WeatherDailyWidget } from '@/components/widget/weather/WeatherDailyWidget';
import { WeatherHourlyWidget } from '@/components/widget/weather/WeatherHourlyWidget';
import { cn } from '@/lib/utils';

/** @deprecated Prefer three separate desktop widgets (weather_hourly, weather_current, weather_daily). */
export function DesktopWeatherPanel() {
  return (
    <WeatherWidgetProvider>
      <div className={cn('pointer-events-auto flex h-full min-h-0 flex-row items-end gap-3')}>
        <WeatherHourlyWidget />
        <WeatherCurrentWidget />
        <WeatherDailyWidget />
      </div>
    </WeatherWidgetProvider>
  );
}
