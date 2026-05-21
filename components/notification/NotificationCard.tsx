'use client';

import { Bell, X } from 'lucide-react';

import { APPS, type AppId } from '@/lib/apps';
import type { NotifLevel, OsNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

function formatRelativeTime(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function levelBorderClass(level: NotifLevel): string {
  switch (level) {
    case 'success':
      return 'border-l-emerald-500';
    case 'warning':
      return 'border-l-amber-500';
    case 'error':
      return 'border-l-red-500';
    default:
      return 'border-l-blue-500';
  }
}

export function NotificationCard({
  n,
  onDismiss,
  onRead,
}: {
  n: OsNotification;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const app = n.appId ? APPS[n.appId as AppId] : null;
  const Icon = app?.icon ?? Bell;

  return (
    <li
      className={cn(
        'group relative list-none rounded-xl border border-white/5 border-l-4 bg-white/5 p-3 motion-gpu',
        levelBorderClass(n.level),
        !n.read && 'bg-white/8'
      )}
      onClick={() => onRead(n.id)}
    >
      <button
        type="button"
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(n.id);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex gap-2 pr-6">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', app?.color ?? 'text-slate-400')} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{n.title}</p>
          {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.body}</p> : null}
          <p className="mt-1 text-[10px] text-slate-500">{formatRelativeTime(n.timestamp)}</p>
        </div>
      </div>
    </li>
  );
}
