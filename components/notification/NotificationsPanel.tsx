'use client';

import { Sun, Volume2, Wifi } from 'lucide-react';

import { PresenceList } from '@/components/motion/PresenceList';
import { NotificationCard } from '@/components/notification/NotificationCard';
import { useNotificationSidebarExpanded } from '@/components/notification/NotificationSidebarExpandedContext';
import type { OsNotification } from '@/lib/notifications';

type Props = {
  notifications: OsNotification[];
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
};

export function NotificationsPanel({ notifications, onDismiss, onRead }: Props) {
  const expanded = useNotificationSidebarExpanded();
  if (!expanded) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/5 p-3">
        <p className="mb-2 text-sm font-medium text-slate-400">Quick controls</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="flex h-14 flex-col items-center justify-center rounded-md border border-white/5 bg-white/5 transition-colors hover:bg-white/10"
          >
            <Wifi className="mb-1 h-4 w-4 text-slate-200" />
            <span className="text-[10px] text-slate-300">Wi-Fi</span>
          </button>
          <button
            type="button"
            className="flex h-14 flex-col items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/20 text-blue-100 transition-colors hover:bg-blue-500/30"
          >
            <Volume2 className="mb-1 h-4 w-4" />
            <span className="text-[10px]">Audio</span>
          </button>
          <button
            type="button"
            className="flex h-14 flex-col items-center justify-center rounded-md border border-white/5 bg-white/5 transition-colors hover:bg-white/10"
          >
            <Sun className="mb-1 h-4 w-4 text-slate-200" />
            <span className="text-[10px] text-slate-300">Display</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No notifications yet</p>
        ) : (
          <PresenceList
            className="space-y-2"
            items={notifications.map((n) => ({ key: n.id, data: n }))}
            getStyle={() => ({ opacity: 1, maxHeight: 200 })}
            getEnterStyle={() => ({ opacity: 0, maxHeight: 0 })}
            getLeaveStyle={() => ({ opacity: 0, maxHeight: 0 })}
          >
            {(item) => (
              <NotificationCard
                n={item.data as OsNotification}
                onDismiss={onDismiss}
                onRead={onRead}
              />
            )}
          </PresenceList>
        )}
      </div>
    </div>
  );
}
