'use client';

import { useEffect, useRef } from 'react';
import { isCapacitorNative } from '@/lib/platform';

/**
 * Initializes Capacitor native plugins (splash, status bar, keyboard) and
 * registers the Firebase Authentication bridge when running in Android/iOS shells.
 * Native Firebase Gradle/Pods setup is still required for OAuth beyond web flows.
 */
export function NativePlatformBridge() {
  const listenerHandlesRef = useRef<Array<{ remove: () => Promise<void> }>>([]);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    let cancelled = false;
    listenerHandlesRef.current = [];

    void (async () => {
      const [
        { Capacitor },
        { SplashScreen },
        { StatusBar, Style },
        { Keyboard, KeyboardResize },
        fbAuth,
      ] = await Promise.all([
        import('@capacitor/core'),
        import('@capacitor/splash-screen'),
        import('@capacitor/status-bar'),
        import('@capacitor/keyboard'),
        import('@capacitor-firebase/authentication'),
      ]);

      if (cancelled || !Capacitor.isNativePlatform()) return;

      await SplashScreen.hide().catch(() => {});
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

      if (Capacitor.getPlatform() === 'ios') {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
      }

      const { FirebaseAuthentication } = fbAuth;
      const authListener = await FirebaseAuthentication.addListener('authStateChange', () => {
        // Native auth events; web session continues to use Firebase JS SDK in the WebView.
      }).catch(() => null);
      if (authListener && !cancelled) listenerHandlesRef.current.push(authListener);
    })();

    return () => {
      cancelled = true;
      void Promise.all(listenerHandlesRef.current.map((h) => h.remove().catch(() => {})));
      listenerHandlesRef.current = [];
    };
  }, []);

  return null;
}
