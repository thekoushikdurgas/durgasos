'use client';

import { useEffect, useState } from 'react';
import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';

export function ClockWidget() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = time
    ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '00:00';

  return (
    <DesktopWidgetChrome maxWidthClass="max-w-[min(100vw-2rem,220px)]" contentClassName="gap-2">
      <p className="text-right text-5xl font-semibold tabular-nums leading-none tracking-tight text-white/95 sm:text-6xl">
        {timeLabel}
      </p>
    </DesktopWidgetChrome>
  );
}
