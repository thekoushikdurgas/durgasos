'use client';

import { AlertCircle, Loader, PartyPopper, X } from 'lucide-react';
import React, { Children, useEffect, useState } from 'react';

import { GlassButton } from '@/components/auth/GlassAuthButton';
import { Presence } from '@/components/motion/PresenceList';
import { SpringBox } from '@/components/motion/SpringBox';
import { overlaySpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { cn } from '@/lib/utils';

export type AuthModalStatus = 'closed' | 'loading' | 'error' | 'success';

const TEXT_LOOP_INTERVAL = 1.5;

const modalSteps = [
  {
    message: 'Creating your account…',
    icon: <Loader className="text-primary h-12 w-12 animate-spin" />,
  },
  {
    message: 'Securing your workspace…',
    icon: <Loader className="text-primary h-12 w-12 animate-spin" />,
  },
  { message: 'Almost ready…', icon: <Loader className="text-primary h-12 w-12 animate-spin" /> },
  {
    message: 'Welcome to Durgas OS',
    icon: <PartyPopper className="h-12 w-12 text-green-500" />,
  },
];

function TextLoop({
  children,
  className,
  interval = 2,
  onIndexChange,
  stopOnEnd = false,
  reduceMotion,
}: {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  onIndexChange?: (index: number) => void;
  stopOnEnd?: boolean;
  reduceMotion?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);
  useEffect(() => {
    const intervalMs = interval * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        if (stopOnEnd && current === items.length - 1) {
          clearInterval(timer);
          return current;
        }
        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [items.length, interval, onIndexChange, stopOnEnd]);

  if (reduceMotion) {
    return <div className={className}>{items[currentIndex]}</div>;
  }

  return (
    <div className={cn('relative inline-block whitespace-nowrap', className)}>
      <Presence
        show
        presenceKey={String(currentIndex)}
        enterStyle={{ opacity: 0, y: 20 }}
        leaveStyle={{ opacity: 0, y: -20 }}
        targetStyle={{ opacity: 1, y: 0 }}
      >
        {items[currentIndex]}
      </Presence>
    </div>
  );
}

export function AuthStatusModal({
  status,
  errorMessage,
  onClose,
  onContinueSuccess,
  reduceMotion,
}: {
  status: AuthModalStatus;
  errorMessage: string;
  onClose: () => void;
  onContinueSuccess: () => void;
  reduceMotion: boolean;
}) {
  const overlayStyle = useReducedMotionStyle({ opacity: 1 }, overlaySpring);
  const cardStyle = useReducedMotionStyle({ opacity: 1, scale: 1 }, overlaySpring);

  const liveMessage =
    status === 'loading'
      ? modalSteps[0].message
      : status === 'error'
        ? errorMessage
        : status === 'success'
          ? modalSteps[modalSteps.length - 1].message
          : '';

  return (
    <Presence show={status !== 'closed'} presenceKey={status} itemClassName="">
      <SpringBox
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        defaultStyle={reduceMotion ? undefined : { opacity: 0 }}
        style={overlayStyle}
        mapStyle={(s) => ({
          opacity: s.opacity,
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <div role="presentation" className="flex w-full items-center justify-center">
          <SpringBox
            className="border-border bg-card/80 relative mx-2 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-4 p-8"
            defaultStyle={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
            style={cardStyle}
            mapStyle={(s) => ({
              opacity: s.opacity,
              transform: `scale(${s.scale ?? 1})`,
            })}
          >
            <div
              role={status === 'error' ? 'alertdialog' : 'dialog'}
              aria-modal="true"
              aria-label="Account sign-in or sign-up status"
              className="flex w-full flex-col items-center gap-4"
            >
              {status === 'error' ? (
                <div className="sr-only" aria-live="assertive" aria-atomic="true">
                  {liveMessage}
                </div>
              ) : (
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                  {liveMessage}
                </div>
              )}
              {(status === 'error' || status === 'success') && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground absolute top-2 right-2 p-1 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle className="text-destructive h-12 w-12" aria-hidden />
                  <p className="text-foreground text-lg font-medium" id="auth-modal-error-text">
                    {errorMessage}
                  </p>
                  <GlassButton type="button" onClick={onClose} size="sm" className="mt-4">
                    Try again
                  </GlassButton>
                </>
              )}
              {status === 'loading' && (
                <TextLoop
                  interval={TEXT_LOOP_INTERVAL}
                  stopOnEnd={true}
                  reduceMotion={reduceMotion}
                >
                  {modalSteps.slice(0, -1).map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-4">
                      {step.icon}
                      <p className="text-foreground text-lg font-medium">{step.message}</p>
                    </div>
                  ))}
                </TextLoop>
              )}
              {status === 'success' && (
                <div className="flex flex-col items-center gap-4">
                  {modalSteps[modalSteps.length - 1].icon}
                  <p className="text-foreground text-lg font-medium">
                    {modalSteps[modalSteps.length - 1].message}
                  </p>
                  <GlassButton type="button" onClick={onContinueSuccess} size="sm">
                    Continue
                  </GlassButton>
                </div>
              )}
            </div>
          </SpringBox>
        </div>
      </SpringBox>
    </Presence>
  );
}

export function getAuthModalLoadingDurationMs(reduceMotion: boolean): number {
  if (reduceMotion) return 0;
  return (modalSteps.length - 1) * TEXT_LOOP_INTERVAL * 1000;
}
