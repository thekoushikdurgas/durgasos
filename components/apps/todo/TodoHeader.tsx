'use client';

import { useRef } from 'react';
import { ListTodo } from 'lucide-react';

import { SpringTabIndicator } from '@/components/motion/SpringTabIndicator';
import type { LinkedGoogleAccountRow } from '@/lib/linked-google-accounts';
import type { TodoWorkspaceRow } from '@/lib/todo-format';

export type TodoShellTab = 'Board' | 'Workspaces';

const TABS: TodoShellTab[] = ['Board', 'Workspaces'];

export function TodoHeader({
  activeTab,
  onTab,
  accounts,
  googleUserId,
  onGoogleUserId,
  onOpenSettings,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
}: {
  activeTab: TodoShellTab;
  onTab: (t: TodoShellTab) => void;
  accounts: LinkedGoogleAccountRow[];
  googleUserId: string | null;
  onGoogleUserId: (id: string | null) => void;
  onOpenSettings: () => void;
  workspaces: TodoWorkspaceRow[];
  activeWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
}) {
  const navRef = useRef<HTMLElement>(null);

  return (
    <header className="flex min-h-14 shrink-0 flex-col gap-2 border-b border-white/10 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight sm:text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <ListTodo className="size-4 text-white" aria-hidden />
          </span>
          Todo
        </div>
        <nav ref={navRef} className="relative flex rounded-lg bg-white/5 p-1">
          <SpringTabIndicator
            containerRef={navRef}
            activeSelector='[aria-selected="true"]'
            className="absolute inset-0 -z-10 rounded-md bg-white/15"
          />
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => onTab(tab)}
              className={`relative z-10 rounded-md px-3 py-1.5 text-xs font-semibold outline-none transition-colors sm:text-sm ${
                activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
        {activeTab === 'Board' && workspaces.length > 0 ? (
          <label className="sr-only" htmlFor="todo-workspace-picker">
            Workspace
          </label>
        ) : null}
        {activeTab === 'Board' && workspaces.length > 0 ? (
          <select
            id="todo-workspace-picker"
            className="max-w-[min(40vw,200px)] truncate rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white"
            value={activeWorkspaceId ?? ''}
            onChange={(e) => onWorkspaceChange(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id} className="bg-slate-900">
                {w.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="todo-linked-account">
          Linked Google account
        </label>
        <select
          id="todo-linked-account"
          className="max-w-[min(50vw,200px)] truncate rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white"
          value={googleUserId ?? ''}
          onChange={(e) => onGoogleUserId(e.target.value || null)}
        >
          {accounts.map((a) => (
            <option key={a.googleUserId} value={a.googleUserId} className="bg-slate-900">
              {a.displayName?.trim() || a.email || a.googleUserId}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          onClick={onOpenSettings}
        >
          Accounts
        </button>
      </div>
    </header>
  );
}
