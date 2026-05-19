'use client';

import { FileEdit, Inbox, PenLine, Send, Star, Trash2 } from 'lucide-react';

import type { GmailFolderId } from '@/lib/gmail-format';
import { cn } from '@/lib/utils';

const FOLDERS: { id: GmailFolderId; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileEdit },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

type GmailSidebarProps = {
  folder: GmailFolderId;
  onFolder: (f: GmailFolderId) => void;
  onCompose: () => void;
  className?: string;
};

export function GmailSidebar({ folder, onFolder, onCompose, className }: GmailSidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-full max-w-[16rem] shrink-0 flex-col border-white/10 bg-slate-900/50 md:w-56 md:border-r',
        className
      )}
    >
      <div className="p-2 pt-3">
        <button
          type="button"
          onClick={onCompose}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500/25 text-sm font-semibold text-sky-100 shadow-sm transition hover:bg-sky-500/35 hover:shadow md:justify-start md:px-4"
        >
          <PenLine className="h-5 w-5 shrink-0" aria-hidden />
          <span className="truncate">Compose</span>
        </button>
      </div>
      <nav
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4"
        aria-label="Mail folders"
      >
        {FOLDERS.map(({ id, label, icon: Icon }) => {
          const active = folder === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onFolder(id)}
              className={cn(
                'flex h-9 w-full items-center gap-3 rounded-r-full px-3 text-left text-sm transition',
                active
                  ? 'border-l-2 border-sky-400 bg-blue-500/20 font-semibold text-sky-100'
                  : 'border-l-2 border-transparent text-white/70 hover:bg-white/[0.06]'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
