'use client';

import { useCallback } from 'react';
import { useOS } from '@/components/os-context';

export function useShellMenuActions() {
  const {
    activeWindow,
    openApp,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    toggleLauncher,
    toggleNotifCenter,
    toggleWidgetSidebar,
  } = useOS();

  return useCallback(
    (action: string) => {
      switch (action) {
        case 'about':
          window.alert('Durgasos — a playful desktop shell demo.');
          break;
        case 'preferences':
          openApp('settings');
          break;
        case 'launcher':
        case 'new-window':
          toggleLauncher();
          break;
        case 'open-explorer':
          openApp('explorer');
          break;
        case 'open-browser':
          openApp('browser');
          break;
        case 'open-terminal':
          openApp('terminal');
          break;
        case 'open-gallery':
          openApp('gallery');
          break;
        case 'close-window':
          if (activeWindow) closeWindow(activeWindow);
          break;
        case 'minimize':
          if (activeWindow) minimizeWindow(activeWindow);
          break;
        case 'zoom':
        case 'fullscreen':
          if (activeWindow) maximizeWindow(activeWindow);
          break;
        case 'notifications':
          toggleNotifCenter();
          break;
        case 'widgets':
          toggleWidgetSidebar();
          break;
        case 'help-shortcuts':
          window.alert(
            'Shell menu: open the bottom-left control, pick an action, or use the dock and ⌘Space for the launcher.'
          );
          break;
        default:
          break;
      }
    },
    [
      activeWindow,
      closeWindow,
      maximizeWindow,
      minimizeWindow,
      openApp,
      toggleLauncher,
      toggleNotifCenter,
      toggleWidgetSidebar,
    ]
  );
}
