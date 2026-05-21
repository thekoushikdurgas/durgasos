'use client';

import { useState } from 'react';

import type { OsLog } from '@/lib/notifications';
import { cn } from '@/lib/utils';

function logLevelClass(level: OsLog['level']): string {
  switch (level) {
    case 'error':
      return 'text-red-400';
    case 'warn':
      return 'text-amber-400';
    case 'debug':
      return 'text-slate-500';
    default:
      return 'text-slate-300';
  }
}

export function LogRow({ log }: { log: OsLog }) {
  const [open, setOpen] = useState(false);
  const hasMeta = log.meta && Object.keys(log.meta).length > 0;

  return (
    <div className="border-b border-white/5 py-2 last:border-0">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => hasMeta && setOpen((o) => !o)}
      >
        <span className="shrink-0 font-mono text-[10px] text-slate-500">
          {new Date(log.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
        <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] uppercase tracking-wide text-slate-400">
          {log.category}
        </span>
        <span className={cn('min-w-0 flex-1 text-xs', logLevelClass(log.level))}>
          {log.message}
        </span>
      </button>
      {open && hasMeta ? (
        <pre className="mt-1 max-h-24 overflow-auto rounded bg-black/30 p-2 text-[10px] text-slate-400">
          {JSON.stringify(log.meta, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
