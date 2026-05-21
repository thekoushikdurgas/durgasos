'use client';

import '@/app/auth-glass.css';

import { useEffect, useRef, useState } from 'react';

import { WelcomeSignUpSection } from '@/components/auth/WelcomeSignUpSection';
import { useAuthSession } from '@/components/auth/AuthSessionContext';
import VaporizeTextCycle, { Tag } from '@/components/ui/vaporize-text-cycle';
import { AUTH_SESSION_CHANGED_EVENT, FOCUS_WELCOME_AUTH_EVENT } from '@/lib/auth-session-events';
import { cn } from '@/lib/utils';

export function WelcomeModal() {
  const { ready, authenticated } = useAuthSession();
  const [forceOpen, setForceOpen] = useState(false);
  const open = ready && (!authenticated || forceOpen);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (authenticated) setForceOpen(false);
  }, [authenticated]);

  useEffect(() => {
    const onSessionChange = () => setForceOpen(false);
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onSessionChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onSessionChange);
  }, []);

  useEffect(() => {
    mainRef.current = document.getElementById('main-content');
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && el.contains(active)) {
        active.blur();
      }
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    }
    return () => {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    };
  }, [open]);

  useEffect(() => {
    const onFocusAuth = () => {
      setForceOpen(true);
      requestAnimationFrame(() => {
        document
          .getElementById('create-account')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    window.addEventListener(FOCUS_WELCOME_AUTH_EVENT, onFocusAuth);
    return () => window.removeEventListener(FOCUS_WELCOME_AUTH_EVENT, onFocusAuth);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col overflow-y-auto bg-black/50 text-foreground backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <h2 id="welcome-modal-title" className="sr-only">
        Sign in or create an account
      </h2>
      <div className="relative flex min-h-[100dvh] w-screen flex-col overflow-y-auto bg-transparent">
        <div
          className={cn(
            'fixed top-4 left-4 z-[610] flex items-center justify-center gap-2 overflow-visible',
            'md:left-1/2 md:-translate-x-1/2'
          )}
        >
          <span className="sr-only">Durgas OS</span>
          <div className="flex h-[200px] w-[100px] origin-center scale-[2] justify-center">
            <VaporizeTextCycle
              className="h-full w-full"
              texts={['Durgas OS', 'Durgasos']}
              font={{
                fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
                fontSize: '18px',
                fontWeight: 600,
              }}
              color="rgb(226, 232, 240)"
              alignment="left"
              direction="left-to-right"
              tag={Tag.P}
              spread={3}
              density={5}
              animation={{
                vaporizeDuration: 2.4,
                fadeInDuration: 1,
                waitDuration: 1.4,
              }}
            />
          </div>
        </div>

        <div className="relative z-[10005] mx-0 flex min-h-0 w-full flex-1 flex-col items-center">
          <WelcomeSignUpSection />
        </div>
      </div>
    </div>
  );
}
