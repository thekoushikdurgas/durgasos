'use client';

import { useEffect, useRef } from 'react';

import { useOS } from '@/components/os-context';
import { DraggableWidget } from '@/components/widget/DraggableWidget';
import { WeatherWidgetProvider } from '@/components/widget/WeatherWidgetProvider';
import { WidgetRenderer } from '@/components/widget/widget-renderers';
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';

export function DesktopWidgetCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLauncherOpen } = useOS();
  const { items, updatePosition, bringToFront, removeWidget, setEnabled } = useWidgetLayout();
  const isMobile = useIsMobile();
  const enabled = items.filter((w) => w.enabled);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const maxStoredZ = items.reduce((m, w) => (w.enabled ? Math.max(m, w.zIndex ?? 1) : m), 0);
    // #region agent log
    fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f051be' },
      body: JSON.stringify({
        sessionId: 'f051be',
        hypothesisId: 'H-Z1',
        location: 'DesktopWidgetCanvas.tsx:launcher-open',
        message: 'Widget z snapshot when launcher opens',
        data: { maxStoredZ, enabledCount: enabled.length, dimmed: true },
        timestamp: Date.now(),
        runId: 'layer-fix-v1',
      }),
    }).catch(() => {});
    // #endregion
  }, [isLauncherOpen, items, enabled.length]);

  return (
    <WeatherWidgetProvider>
      <div
        ref={containerRef}
        className={cn(
          'pointer-events-none absolute inset-0 z-0 transition-opacity duration-200',
          isLauncherOpen && !isMobile && 'opacity-0',
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
