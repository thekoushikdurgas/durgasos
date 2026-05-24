'use client';

import { type FormEvent, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListTodo,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  User,
  ChevronDown,
  Settings,
  Laptop,
} from 'lucide-react';
import type { TodoWorkspaceRow } from '@/lib/todo-format';
import type { LinkedGoogleAccountRow } from '@/lib/linked-google-accounts';
import { cn } from '@/lib/utils';

type TodoSidebarProps = {
  workspaces: TodoWorkspaceRow[];
  loading: boolean;
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  createWorkspace: (name: string) => Promise<TodoWorkspaceRow | null>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
  accounts: LinkedGoogleAccountRow[];
  googleUserId: string | null;
  onGoogleUserId: (id: string | null) => void;
  onOpenSettings: () => void;
  isLocalMode: boolean;
};

export function TodoSidebar({
  workspaces,
  loading,
  activeWorkspaceId,
  onWorkspaceSelect,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  accounts,
  googleUserId,
  onGoogleUserId,
  onOpenSettings,
  isLocalMode,
}: TodoSidebarProps) {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeAccount = accounts.find((a) => a.googleUserId === googleUserId) || accounts[0];

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const created = await createWorkspace(name);
      if (created) {
        setNewWorkspaceName('');
        setIsCreating(false);
        onWorkspaceSelect(created.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const startRename = (w: TodoWorkspaceRow) => {
    setEditingId(w.id);
    setEditName(w.name);
  };

  const submitRename = async (id: string) => {
    const name = editName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const success = await renameWorkspace(id, name);
      if (success) {
        setEditingId(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e: FormEvent, w: TodoWorkspaceRow) => {
    e.stopPropagation();
    const msg = isLocalMode
      ? `Delete workspace "${w.name}" and all its tasks permanently?`
      : `Remove workspace "${w.name}"? Google Task lists won't be deleted.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await deleteWorkspace(w.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-slate-900/60 backdrop-blur-md">
      {/* App Brand Header */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-white/10">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20">
          <ListTodo className="size-4 text-white" aria-hidden />
        </span>
        <span className="font-bold text-white tracking-tight">Todo App</span>
      </div>

      {/* Account Picker / Info */}
      {accounts.length > 1 ? (
        <div className="relative border-b border-white/10 px-3 py-3">
          <button
            type="button"
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="flex w-full items-center gap-2.5 rounded-lg bg-white/[0.04] p-2 text-left text-xs text-white/80 hover:bg-white/[0.08] transition-colors focus:outline-none"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/40 text-violet-200">
              {activeAccount?.id === 'local-device' ? (
                <Laptop className="size-3.5" />
              ) : (
                <User className="size-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-white">
                {activeAccount?.displayName?.trim() || activeAccount?.email || 'On this device'}
              </div>
              <div className="truncate text-[10px] text-white/40">
                {activeAccount?.id === 'local-device' ? 'Local storage' : 'Google Tasks synced'}
              </div>
            </div>
            <ChevronDown className="size-3.5 shrink-0 text-white/40" />
          </button>

          <AnimatePresence>
            {showAccountDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAccountDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-1.5 shadow-xl shadow-black/40"
                >
                  {accounts.map((acc) => (
                    <button
                      key={acc.googleUserId}
                      type="button"
                      onClick={() => {
                        onGoogleUserId(acc.googleUserId);
                        setShowAccountDropdown(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5',
                        acc.googleUserId === googleUserId
                          ? 'text-violet-300 font-semibold'
                          : 'text-white/70'
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5">
                        {acc.id === 'local-device' ? (
                          <Laptop className="size-3" />
                        ) : (
                          <User className="size-3" />
                        )}
                      </span>
                      <span className="truncate flex-1">
                        {acc.displayName?.trim() || acc.email || 'On this device'}
                      </span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                      setShowAccountDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-white/60 hover:bg-white/5"
                  >
                    <Settings className="size-3.5" />
                    <span>Manage Accounts</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Only Local Mode (no linked account dropdown needed) */
        <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Laptop className="size-3.5" />
            <span>Local Mode</span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[10px] text-violet-300/80 hover:text-violet-300 transition-colors"
          >
            Link Google
          </button>
        </div>
      )}

      {/* Workspaces List Label */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
        <span>Workspaces</span>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="text-white/60 hover:text-white transition-colors"
          title="Create Workspace"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {isCreating && (
          <form onSubmit={handleCreate} className="px-2 py-1 flex items-center gap-1">
            <input
              type="text"
              placeholder="Workspace name..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              autoFocus
              className="w-full rounded bg-slate-950 px-2 py-1 text-xs text-white border border-violet-500/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newWorkspaceName.trim() || busy}
              className="rounded p-1 text-emerald-400 hover:bg-white/5 disabled:opacity-50"
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewWorkspaceName('');
              }}
              className="rounded p-1 text-white/40 hover:bg-white/5"
            >
              <X className="size-3.5" />
            </button>
          </form>
        )}

        {loading && workspaces.length === 0 ? (
          <div className="px-3 py-2 text-xs text-white/40">Loading workspaces...</div>
        ) : workspaces.length === 0 && !isCreating ? (
          <div className="px-3 py-2 text-xs text-white/40">No workspaces. Create one above!</div>
        ) : null}

        <ul className="space-y-0.5 relative">
          {workspaces.map((w) => {
            const isActive = w.id === activeWorkspaceId;
            const isEditing = editingId === w.id;

            return (
              <li
                key={w.id}
                onClick={() => !isEditing && onWorkspaceSelect(w.id)}
                className={cn(
                  'relative group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer',
                  isActive ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                )}
              >
                {/* Active Capsule Overlay */}
                {isActive && (
                  <motion.div
                    layoutId="activeWorkspaceBg"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600/20 to-indigo-600/10 border border-violet-500/20"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <div className="relative z-10 min-w-0 flex-1 pr-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submitRename(w.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full rounded bg-slate-950 px-1.5 py-0.5 text-xs text-white border border-white/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void submitRename(w.id)}
                        className="text-emerald-400 p-0.5 hover:bg-white/5 rounded"
                      >
                        <Check className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-white/40 p-0.5 hover:bg-white/5 rounded"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="truncate font-medium">{w.name}</div>
                  )}
                </div>

                {!isEditing && (
                  <div className="relative z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(w);
                      }}
                      className="rounded p-1 text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, w)}
                      className="rounded p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Optional quick add input at the bottom */}
      <div className="border-t border-white/10 p-3">
        <div className="text-[10px] text-white/35 flex items-center justify-between">
          <span>Synced to Local DB</span>
          {isLocalMode && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />}
        </div>
      </div>
    </div>
  );
}
