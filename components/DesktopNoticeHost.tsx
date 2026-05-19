'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function DesktopNoticeHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const onNotice = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const m = ce.detail?.message?.trim();
      if (!m) return;
      setMessage(m);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setMessage(null), 4200);
    };

    window.addEventListener('durgasos-notice', onNotice as EventListener);
    return () => {
      window.removeEventListener('durgasos-notice', onNotice as EventListener);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-28 left-1/2 z-[190] max-w-md -translate-x-1/2 px-4',
        'rounded-lg border border-amber-500/30 bg-slate-950/95 px-4 py-2 text-center text-xs text-amber-100 shadow-xl backdrop-blur-md'
      )}
    >
      {message}
    </div>
  );
}
