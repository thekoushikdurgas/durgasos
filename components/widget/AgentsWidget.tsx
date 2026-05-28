'use client';

import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';

export function AgentsWidget() {
  return (
    <DesktopWidgetChrome>
      <p className="text-sm leading-relaxed text-white/70">
        Agent status feed will connect to workflow events when enabled on the backend.
      </p>
    </DesktopWidgetChrome>
  );
}
