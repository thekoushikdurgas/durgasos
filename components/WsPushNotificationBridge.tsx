'use client';

import { useWsPushNotifications } from '@/hooks/use-ws-push-notifications';
import { PushToastStrip } from '@/components/notification/PushToastStrip';

/**
 * Mount this once inside the OS shell (inside NotificationsProvider).
 * It opens a persistent WebSocket to system.notifications and shows
 * floating toasts for every push event.
 */
export function WsPushNotificationBridge() {
  useWsPushNotifications(true);
  return <PushToastStrip />;
}
