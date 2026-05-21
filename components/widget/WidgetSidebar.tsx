'use client';

import { useEffect, useState } from 'react';

import { WidgetCatalogPanel } from '@/components/widget/WidgetCatalogPanel';
import { WidgetSidebarShell } from '@/components/widget/WidgetSidebarShell';
import { useOS } from '@/components/os-context';
import { useWidgetLayout } from '@/hooks/use-widget-layout';

export function WidgetSidebar() {
  const { isWidgetSidebarOpen, toggleWidgetSidebar } = useOS();
  const { resetLayout } = useWidgetLayout();
  const [pinned, setPinned] = useState(true);

  // #region agent log
  useEffect(() => {
    if (!isWidgetSidebarOpen) return;
    fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f051be' },
      body: JSON.stringify({
        sessionId: 'f051be',
        hypothesisId: 'H-Widget1',
        location: 'WidgetSidebar.tsx:open',
        message: 'Widget sidebar mounted visible',
        data: { pinned },
        timestamp: Date.now(),
        runId: 'widget-sidebar-fix',
      }),
    }).catch(() => {});
  }, [isWidgetSidebarOpen, pinned]);
  // #endregion

  if (!isWidgetSidebarOpen) return null;

  return (
    <div className="animate-in fade-in duration-200">
      <WidgetSidebarShell
        pinned={pinned}
        onPinnedChange={setPinned}
        onClose={toggleWidgetSidebar}
        onResetLayout={resetLayout}
      >
        <WidgetCatalogPanel />
      </WidgetSidebarShell>
    </div>
  );
}
