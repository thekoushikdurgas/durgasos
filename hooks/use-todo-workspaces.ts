'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CREATE_TODO_WORKSPACE,
  DELETE_TODO_WORKSPACE,
  RENAME_TODO_WORKSPACE,
  TODO_WORKSPACES,
} from '@/lib/graphql-modules';
import { LOCAL_GOOGLE_USER_ID, type TodoWorkspaceRow } from '@/lib/todo-format';
import { swallowStorageError } from '@/lib/safe-client-storage';

function storageKey(googleUserId: string) {
  return `durgasos-todo-workspace-${googleUserId}`;
}

function readStoredWorkspaceId(googleUserId: string | null): string | null {
  if (!googleUserId || typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(storageKey(googleUserId))?.trim();
    return v || null;
  } catch {
    return null;
  }
}

function writeStoredWorkspaceId(googleUserId: string | null, id: string | null) {
  if (!googleUserId || typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(storageKey(googleUserId), id);
    else window.localStorage.removeItem(storageKey(googleUserId));
  } catch (err) {
    swallowStorageError('todo-workspaces.writeStored', err);
  }
}

export function useTodoWorkspaces(
  googleUserId: string | null,
  accessToken: string | null
): {
  workspaces: TodoWorkspaceRow[];
  loading: boolean;
  refetch: () => Promise<unknown>;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  createWorkspace: (name: string) => Promise<TodoWorkspaceRow | null>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
} {
  const [pickedWorkspaceId, setPickedWorkspaceId] = useState<string | null>(null);
  const bootstrapRef = useRef(false);

  const listQ = useQuery(TODO_WORKSPACES, {
    skip: !googleUserId,
    variables: { googleUserId: googleUserId ?? '' },
    fetchPolicy: 'cache-and-network',
  });

  const [createMut] = useMutation(CREATE_TODO_WORKSPACE);
  const [renameMut] = useMutation(RENAME_TODO_WORKSPACE);
  const [deleteMut] = useMutation(DELETE_TODO_WORKSPACE);

  const workspaces: TodoWorkspaceRow[] = useMemo(() => {
    const raw = listQ.data?.todoWorkspaces;
    if (!Array.isArray(raw)) return [];
    return raw.map((w) => ({
      id: w.id,
      name: w.name,
      storage: w.storage === 'local' ? 'local' : 'google',
      googleUserId: w.googleUserId,
      backlogListId: w.backlogListId ?? '',
      todoListId: w.todoListId ?? '',
      doingListId: w.doingListId ?? '',
      doneListId: w.doneListId ?? '',
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }, [listQ.data?.todoWorkspaces]);

  const activeWorkspaceId = useMemo(() => {
    if (!googleUserId) return null;
    const ids = workspaces.map((w) => w.id);
    const idSet = new Set(ids);
    if (pickedWorkspaceId && idSet.has(pickedWorkspaceId)) return pickedWorkspaceId;
    const stored = readStoredWorkspaceId(googleUserId);
    if (stored && idSet.has(stored)) return stored;
    return ids[0] ?? null;
  }, [googleUserId, pickedWorkspaceId, workspaces]);

  useEffect(() => {
    if (googleUserId && activeWorkspaceId) {
      writeStoredWorkspaceId(googleUserId, activeWorkspaceId);
    }
  }, [googleUserId, activeWorkspaceId]);

  useEffect(() => {
    bootstrapRef.current = false;
  }, [googleUserId]);

  const setActiveWorkspaceId = useCallback(
    (id: string | null) => {
      setPickedWorkspaceId(id);
      writeStoredWorkspaceId(googleUserId, id);
    },
    [googleUserId]
  );

  useEffect(() => {
    if (!googleUserId || listQ.loading) return;
    if (bootstrapRef.current) return;
    if (workspaces.length > 0) return;
    const isLocal = googleUserId === LOCAL_GOOGLE_USER_ID;
    if (!isLocal && !accessToken) return;
    bootstrapRef.current = true;
    const vars = isLocal
      ? { googleUserId, name: 'Personal' }
      : {
          googleUserId,
          name: 'Personal',
          params: { access_token: accessToken },
        };
    void createMut({ variables: vars })
      .then(() => listQ.refetch())
      .catch(() => {
        bootstrapRef.current = false;
      });
  }, [googleUserId, accessToken, listQ.loading, workspaces.length, createMut, listQ]);

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!googleUserId) return null;
      const isLocal = googleUserId === LOCAL_GOOGLE_USER_ID;
      if (!isLocal && !accessToken) return null;
      const r = await createMut({
        variables: isLocal
          ? { googleUserId, name: name.trim() }
          : {
              googleUserId,
              name: name.trim(),
              params: { access_token: accessToken },
            },
      });
      await listQ.refetch();
      const w = r.data?.createTodoWorkspace;
      if (!w) return null;
      const row: TodoWorkspaceRow = {
        id: w.id,
        name: w.name,
        storage: w.storage === 'local' ? 'local' : 'google',
        googleUserId: w.googleUserId,
        backlogListId: w.backlogListId ?? '',
        todoListId: w.todoListId ?? '',
        doingListId: w.doingListId ?? '',
        doneListId: w.doneListId ?? '',
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      };
      setActiveWorkspaceId(row.id);
      return row;
    },
    [googleUserId, accessToken, createMut, listQ, setActiveWorkspaceId]
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      try {
        await renameMut({ variables: { workspaceId, name: name.trim() } });
        await listQ.refetch();
        return true;
      } catch {
        return false;
      }
    },
    [renameMut, listQ]
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        const r = await deleteMut({ variables: { workspaceId } });
        const ok = Boolean(r.data?.deleteTodoWorkspace);
        await listQ.refetch();
        return ok;
      } catch {
        return false;
      }
    },
    [deleteMut, listQ]
  );

  return {
    workspaces,
    loading: listQ.loading,
    refetch: listQ.refetch,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  };
}
