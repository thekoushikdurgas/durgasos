'use client';

import { createContext, useContext, type ReactNode } from 'react';

const NotificationSidebarExpandedContext = createContext(true);

export function NotificationSidebarExpandedProvider({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <NotificationSidebarExpandedContext.Provider value={expanded}>
      {children}
    </NotificationSidebarExpandedContext.Provider>
  );
}

export function useNotificationSidebarExpanded(): boolean {
  return useContext(NotificationSidebarExpandedContext);
}
