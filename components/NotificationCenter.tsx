'use client';

import { useState } from 'react';

import { NotificationsPanel } from '@/components/notification/NotificationsPanel';
import { NotificationSidebarShell } from '@/components/notification/NotificationSidebarShell';
import type { PanelTab } from '@/components/notification/sidebar-motion';
import { SystemLogsPanel } from '@/components/notification/SystemLogsPanel';
import { useOS } from '@/components/os-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useOsLogs } from '@/hooks/use-os-logs';
import { useSystemStats } from '@/hooks/use-system-stats';
import { useSystemHealth } from '@/hooks/use-system-health';

export function NotificationCenter() {
  const { isNotifOpen, toggleNotifCenter } = useOS();
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } =
    useNotifications();
  const { filteredLogs, levelFilter, setLevelFilter, clearLogs } = useOsLogs();
  const { overall } = useSystemHealth();
  const stats = useSystemStats(overall);

  const [tab, setTab] = useState<PanelTab>('notifications');
  const [pinned, setPinned] = useState(true);

  if (!isNotifOpen) return null;

  return (
    <div className="animate-in fade-in duration-200">
      <NotificationSidebarShell
        activeTab={tab}
        onTabChange={setTab}
        onClose={toggleNotifCenter}
        unreadCount={unreadCount}
        backendHealth={stats.backendHealth}
        pinned={pinned}
        onPinnedChange={setPinned}
        onMarkAllRead={markAllRead}
        onClearNotifications={clearAll}
        onClearLogs={clearLogs}
        hasNotifications={notifications.length > 0}
      >
        {tab === 'notifications' ? (
          <NotificationsPanel notifications={notifications} onDismiss={dismiss} onRead={markRead} />
        ) : (
          <SystemLogsPanel
            stats={stats}
            filteredLogs={filteredLogs}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
          />
        )}
      </NotificationSidebarShell>
    </div>
  );
}
