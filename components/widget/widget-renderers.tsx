'use client';

import { useEffect, useState } from 'react';

import { AiSearchWidget } from '@/components/widget/AiSearchWidget';
import { WeatherCurrentWidget } from '@/components/widget/weather/WeatherCurrentWidget';
import { WeatherDailyWidget } from '@/components/widget/weather/WeatherDailyWidget';
import { WeatherHourlyWidget } from '@/components/widget/weather/WeatherHourlyWidget';
import { WidgetShell } from '@/components/widgets/WidgetShell';
import { useOS } from '@/components/os-context';
import type { WidgetLayoutItem } from '@/lib/widget-registry';
import { cn } from '@/lib/utils';

type RendererProps = {
  item: WidgetLayoutItem;
  onRemove: () => void;
  onConfigure?: () => void;
};

function ClockWidgetContent() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-5xl font-thin leading-none tracking-tight text-white/90 drop-shadow-md sm:text-[80px]">
        {time
          ? time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '00:00'}
      </div>
    </div>
  );
}

function QuickActionsWidgetContent() {
  const { toggleLauncher, openApp } = useOS();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className={cn(
          'rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
          'hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40'
        )}
        onClick={toggleLauncher}
      >
        Launcher
      </button>
      <button
        type="button"
        className={cn(
          'rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
          'hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40'
        )}
        onClick={() => openApp('workflow')}
      >
        Workflows
      </button>
    </div>
  );
}

export function WidgetRenderer({ item, onRemove, onConfigure }: RendererProps) {
  switch (item.type) {
    case 'clock':
      return (
        <WidgetShell onRemove={onRemove} onConfigure={onConfigure}>
          <ClockWidgetContent />
        </WidgetShell>
      );
    case 'weather_hourly':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <WeatherHourlyWidget />
        </WidgetShell>
      );
    case 'weather_current':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <WeatherCurrentWidget />
        </WidgetShell>
      );
    case 'weather_daily':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <WeatherDailyWidget />
        </WidgetShell>
      );
    case 'ai_search':
      return (
        <WidgetShell onRemove={onRemove}>
          <AiSearchWidget />
        </WidgetShell>
      );
    case 'agent_status':
      return (
        <WidgetShell title="Agents" onRemove={onRemove}>
          <p className="max-w-xs text-right text-xs text-white/55">
            Agent status feed will connect to workflow events when enabled on the backend.
          </p>
        </WidgetShell>
      );
    case 'system_feed':
      return (
        <WidgetShell title="System feed" onRemove={onRemove}>
          <p className="max-w-xs text-right text-xs text-white/55">
            Desktop event timeline — wire to system.feed WebSocket when available.
          </p>
        </WidgetShell>
      );
    case 'quick_actions':
      return (
        <WidgetShell title="Quick actions" onRemove={onRemove}>
          <QuickActionsWidgetContent />
        </WidgetShell>
      );
    default:
      return null;
  }
}
