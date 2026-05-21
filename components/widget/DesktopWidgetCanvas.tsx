'use client';

import { useRef } from 'react';

import { DraggableWidget } from '@/components/widget/DraggableWidget';
import { WeatherWidgetProvider } from '@/components/widget/WeatherWidgetProvider';
import { WidgetRenderer } from '@/components/widget/widget-renderers';
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';

export function DesktopWidgetCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { items, updatePosition, bringToFront, removeWidget, setEnabled } = useWidgetLayout();
  const isMobile = useIsMobile();
  const enabled = items.filter((w) => w.enabled);

  return (
    <WeatherWidgetProvider>
      <div
        ref={containerRef}
        className={cn(
          'pointer-events-none absolute inset-0 z-0',
          isMobile && 'flex flex-col items-stretch justify-end gap-3 p-4 pb-36 pt-24'
        )}
        aria-label="Desktop widgets"
      >
        {isMobile ? (
          <div className="pointer-events-auto flex w-full max-w-md flex-col items-stretch gap-3 self-end">
            {enabled.map((item) => (
              <WidgetRenderer
                key={item.id}
                item={item}
                onRemove={() => removeWidget(item.id)}
                onConfigure={() => setEnabled(item.id, false)}
              />
            ))}
          </div>
        ) : (
          enabled.map((item) => (
            <DraggableWidget
              key={item.id}
              item={item}
              containerRef={containerRef}
              onPositionChange={updatePosition}
              onBringToFront={bringToFront}
            >
              <WidgetRenderer
                item={item}
                onRemove={() => removeWidget(item.id)}
                onConfigure={() => setEnabled(item.id, false)}
              />
            </DraggableWidget>
          ))
        )}
      </div>
    </WeatherWidgetProvider>
  );
}
