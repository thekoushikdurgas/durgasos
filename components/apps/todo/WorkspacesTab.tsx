'use client';

import { type FormEvent, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import type { TodoWorkspaceRow } from '@/lib/todo-format';

type WorkspacesTabProps = {
  workspaces: TodoWorkspaceRow[];
  loading: boolean;
  activeWorkspaceId: string | null;
  createWorkspace: (name: string) => Promise<TodoWorkspaceRow | null>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
  /** Device-local workspaces: deleting removes tasks from the database only. */
  isLocalMode?: boolean;
};

export function WorkspacesTab({
  workspaces,
  loading,
  activeWorkspaceId,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  isLocalMode = false,
}: WorkspacesTabProps) {
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const n = newName.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const row = await createWorkspace(n);
      if (row) setNewName('');
    } finally {
      setBusy(false);
    }
  };

  const startRename = (w: TodoWorkspaceRow) => {
    setEditingId(w.id);
    setEditName(w.name);
  };

  const submitRename = async (id: string) => {
    const n = editName.trim();
    if (!n) return;
    setBusy(true);
    try {
      await renameWorkspace(id, n);
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const msg = isLocalMode
      ? 'Delete this workspace and all its tasks from this device?'
      : 'Remove this workspace from the desktop? Google Task lists are not deleted.';
    if (!window.confirm(msg)) {
      return;
    }
    setBusy(true);
    try {
      await deleteWorkspace(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="new-workspace-name" className="mb-1 block text-xs text-white/50">
            New workspace
          </label>
          <input
            id="new-workspace-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Work, Home"
            maxLength={64}
            disabled={busy || loading}
            className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || loading || !newName.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {isLocalMode ? (
        <p className="text-xs text-white/45">
          On-device workspaces store tasks in your account database only. Deleting a workspace
          removes those tasks; nothing is deleted in Google.
        </p>
      ) : null}

      {loading && workspaces.length === 0 ? (
        <p className="text-sm text-white/50">Loading workspaces…</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {workspaces.map((w) => (
          <li
            key={w.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
              w.id === activeWorkspaceId
                ? 'border-violet-500/50 bg-violet-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="min-w-0 flex-1">
              {editingId === w.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label={`Rename workspace ${w.name}`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={64}
                    className="min-w-[8rem] flex-1 rounded border border-white/20 bg-slate-950 px-2 py-1 text-white"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitRename(w.id)}
                    className="text-xs text-violet-300 hover:text-violet-200"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-white/50 hover:text-white/80"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <span className="font-medium text-white">{w.name}</span>
                  <span className="ml-2 text-xs text-white/40">
                    Updated {new Date(w.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {editingId !== w.id ? (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Rename ${w.name}`}
                  disabled={busy}
                  onClick={() => startRename(w)}
                  className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${w.name}`}
                  disabled={busy}
                  onClick={() => void handleDelete(w.id)}
                  className="rounded p-1.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
