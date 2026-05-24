'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OS_NOTIFICATION_EVENT, type OsNotification } from '@/lib/notifications';

const TOAST_DURATION_MS = 4500;
const MAX_TOASTS = 4;

const LEVEL_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
};

const LEVEL_STYLE: Record<OsNotification['level'], string> = {
  info: 'border-sky-500/30 bg-sky-950/70 shadow-sky-900/20',
  success: 'border-emerald-500/30 bg-emerald-950/70 shadow-emerald-900/20',
  warning: 'border-amber-500/30 bg-amber-950/70 shadow-amber-900/20',
  error: 'border-red-500/30 bg-red-950/70 shadow-red-900/20',
};

const LEVEL_ICON_COLOR: Record<OsNotification['level'], string> = {
  info: 'text-sky-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
};

const LEVEL_PROGRESS: Record<OsNotification['level'], string> = {
  info: 'bg-sky-400/60',
  success: 'bg-emerald-400/60',
  warning: 'bg-amber-400/60',
  error: 'bg-red-400/60',
};

type ToastItem = OsNotification & { expiresAt: number; removing: boolean };

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = LEVEL_ICON[toast.level];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'pointer-events-auto relative flex w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-lg backdrop-blur-md',
        'transition-all duration-300',
        toast.removing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        LEVEL_STYLE[toast.level]
      )}
    >
      {/* Auto-dismiss progress bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden rounded-t-xl bg-white/10">
        <div
          className={cn('h-full rounded-full', LEVEL_PROGRESS[toast.level])}
          style={{
            width: '100%',
            animation: `toast-progress ${TOAST_DURATION_MS}ms linear forwards`,
          }}
        />
      </div>

      <div className="flex w-full gap-3 p-3 pt-4">
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          <Icon className={cn('h-4 w-4', LEVEL_ICON_COLOR[toast.level])} aria-hidden />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-white/90 line-clamp-1">
            {toast.title}
          </p>
          {toast.body && (
            <p className="mt-0.5 text-xs leading-snug text-white/55 line-clamp-2">{toast.body}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          aria-label="Dismiss notification"
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-white/30 hover:text-white/70 transition-colors"
          onClick={() => onDismiss(toast.id)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Floating toast strip — renders in the top-right corner.
 *  Listens for OS_NOTIFICATION_EVENT and auto-dismisses after TOAST_DURATION_MS. */
export function PushToastStrip() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = (id: string) => {
    // Trigger exit animation first, then remove
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 320);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ notification?: OsNotification }>;
      const n = ce.detail?.notification;
      if (!n?.id) return;

      const toast: ToastItem = {
        ...n,
        expiresAt: Date.now() + TOAST_DURATION_MS,
        removing: false,
      };

      setToasts((prev) => {
        const without = prev.filter((t) => t.id !== n.id);
        return [toast, ...without].slice(0, MAX_TOASTS);
      });

      // Auto-dismiss
      const timer = setTimeout(() => dismiss(n.id), TOAST_DURATION_MS);
      timersRef.current.set(n.id, timer);
    };

    window.addEventListener(OS_NOTIFICATION_EVENT, handler as EventListener);
    const timers = timersRef.current;
    return () => {
      window.removeEventListener(OS_NOTIFICATION_EVENT, handler as EventListener);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); transform-origin: left; }
          to   { transform: scaleX(0); transform-origin: left; }
        }
      `}</style>

      <div
        className="pointer-events-none fixed right-4 top-14 z-[9999] flex flex-col gap-2"
        aria-label="Notifications"
        role="region"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </>
  );
}
