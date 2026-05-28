'use client';

import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';

export function SystemFeedWidget() {
  return (
    <DesktopWidgetChrome>
      <p className="text-sm leading-relaxed text-white/70">
        Desktop event timeline — wire to system.feed WebSocket when available.
      </p>
    </DesktopWidgetChrome>
  );
}
