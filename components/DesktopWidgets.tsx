'use client';

import { useEffect, useState } from 'react';

import { DesktopWeatherPanel } from '@/components/DesktopWeatherPanel';
import { WidgetShell } from '@/components/widgets/WidgetShell';
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { useOS } from '@/components/os-context';
import { cn } from '@/lib/utils';

export function DesktopWidgets() {
  const { items, setEnabled, removeWidget } = useWidgetLayout();
  const { toggleLauncher, openApp } = useOS();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-end justify-end gap-4 p-6 pb-36 pr-6 pt-24">
      <div className="flex w-full max-w-md flex-col items-end gap-4">
        {items
          .filter((w) => w.enabled)
          .map((w) => {
            if (w.type === 'clock') {
              return (
                <WidgetShell
                  key={w.id}
                  onRemove={() => removeWidget(w.id)}
                  onConfigure={() => setEnabled(w.id, false)}
                >
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
                </WidgetShell>
              );
            }
            if (w.type === 'weather') {
              return (
                <WidgetShell
                  key={w.id}
                  onRemove={() => removeWidget(w.id)}
                  onConfigure={() => setEnabled(w.id, false)}
                >
                  <DesktopWeatherPanel />
                </WidgetShell>
              );
            }
            if (w.type === 'agent_status') {
              return (
                <WidgetShell key={w.id} title="Agents" onRemove={() => removeWidget(w.id)}>
                  <p className="max-w-xs text-right text-xs text-white/55">
                    Agent status feed will connect to workflow events (Kafka) when enabled on the
                    backend.
                  </p>
                </WidgetShell>
              );
            }
            if (w.type === 'system_feed') {
              return (
                <WidgetShell key={w.id} title="System feed" onRemove={() => removeWidget(w.id)}>
                  <p className="max-w-xs text-right text-xs text-white/55">
                    Desktop event timeline — wire to `system.feed` WebSocket when available.
                  </p>
                </WidgetShell>
              );
            }
            if (w.type === 'quick_actions') {
              return (
                <WidgetShell key={w.id} title="Quick actions" onRemove={() => removeWidget(w.id)}>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className={cn(
                        'pointer-events-auto rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
                        'hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)]'
                      )}
                      onClick={toggleLauncher}
                    >
                      Launcher
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'pointer-events-auto rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
                        'hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary,#3b82f6)]'
                      )}
                      onClick={() => openApp('workflow')}
                    >
                      Workflows
                    </button>
                  </div>
                </WidgetShell>
              );
            }
            return null;
          })}
      </div>
    </div>
  );
}
