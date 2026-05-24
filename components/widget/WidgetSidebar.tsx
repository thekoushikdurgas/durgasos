'use client';

import { useState } from 'react';

import { WidgetCatalogPanel } from '@/components/widget/WidgetCatalogPanel';
import { WidgetManagePanel } from '@/components/widget/WidgetManagePanel';
import { WidgetSidebarShell } from '@/components/widget/WidgetSidebarShell';
import { useOS } from '@/components/os-context';
import { useWidgetLayout } from '@/hooks/use-widget-layout';

export function WidgetSidebar() {
  const { isWidgetSidebarOpen, toggleWidgetSidebar } = useOS();
  const { resetLayout } = useWidgetLayout();
  const [pinned, setPinned] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'manage'>('catalog');

  if (!isWidgetSidebarOpen) return null;

  return (
    <div className="animate-in fade-in duration-200">
      <WidgetSidebarShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pinned={pinned}
        onPinnedChange={setPinned}
        onClose={toggleWidgetSidebar}
        onResetLayout={resetLayout}
      >
        {activeTab === 'catalog' ? (
          <WidgetCatalogPanel />
        ) : (
          <WidgetManagePanel onResetLayout={resetLayout} />
        )}
      </WidgetSidebarShell>
    </div>
  );
}
