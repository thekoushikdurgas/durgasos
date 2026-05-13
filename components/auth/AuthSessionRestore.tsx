'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { restoreAuthSessionFromLocalStorage } from '@/lib/restore-auth-session';

/** Rehydrates httpOnly cookies from localStorage after a full page load. */
export function AuthSessionRestore() {
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      const ok = await restoreAuthSessionFromLocalStorage();
      if (!ok) return;
      router.refresh();
      if (pathname === '/welcome' || pathname?.startsWith('/welcome/')) {
        router.replace('/');
      }
    })();
  }, [pathname, router]);

  return null;
}
