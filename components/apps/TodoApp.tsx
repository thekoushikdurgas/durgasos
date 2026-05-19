'use client';

import { useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';

import { BoardTab } from '@/components/apps/todo/BoardTab';
import { TodoHeader, type TodoShellTab } from '@/components/apps/todo/TodoHeader';
import { WorkspacesTab } from '@/components/apps/todo/WorkspacesTab';
import { useOS } from '@/components/os-context';
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import { useTodoBoard } from '@/hooks/use-todo-board';
import { useTodoLocalBoard } from '@/hooks/use-todo-local-board';
import { useTodoWorkspaces } from '@/hooks/use-todo-workspaces';
import { GET_LINKED_GOOGLE_ACCOUNT_TOKEN } from '@/lib/graphql-modules';
import type { LinkedGoogleAccountRow } from '@/lib/linked-google-accounts';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';
import {
  accountHasGoogleTasksScope,
  LOCAL_GOOGLE_USER_ID,
  readTodoAccountPicker,
  writeTodoAccountPicker,
} from '@/lib/todo-format';

export function TodoApp() {
  const { openApp } = useOS();
  const { authed, accounts, setGoogleUserId, linkedLoading } = useLinkedGoogleAccount();

  const localPickerRow = useMemo(
    (): LinkedGoogleAccountRow => ({
      id: 'local-device',
      googleUserId: LOCAL_GOOGLE_USER_ID,
      email: '',
      displayName: 'On this device',
      scopesGranted: null,
    }),
    []
  );

  const pickerAccounts = useMemo(() => [localPickerRow, ...accounts], [localPickerRow, accounts]);

  const [pickedTodoAccountId, setPickedTodoAccountId] = useState<string | null>(null);
  const [shellTab, setShellTab] = useState<TodoShellTab>('Board');

  const defaultTodoAccountId = useMemo(() => {
    if (!authed) return null;
    const ids = new Set(pickerAccounts.map((a) => a.googleUserId));
    const stored = readTodoAccountPicker();
    if (stored && ids.has(stored)) return stored;
    if (accounts.length > 0) return accounts[0]!.googleUserId;
    return LOCAL_GOOGLE_USER_ID;
  }, [authed, accounts, pickerAccounts]);

  const todoAccountId = useMemo(() => {
    if (!authed || !defaultTodoAccountId) return null;
    const ids = new Set(pickerAccounts.map((a) => a.googleUserId));
    if (pickedTodoAccountId && ids.has(pickedTodoAccountId)) return pickedTodoAccountId;
    return defaultTodoAccountId;
  }, [authed, defaultTodoAccountId, pickedTodoAccountId, pickerAccounts]);

  const isLocalMode = todoAccountId === LOCAL_GOOGLE_USER_ID;

  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || isLocalMode || !todoAccountId,
    variables: { googleUserId: todoAccountId ?? '' },
    fetchPolicy: 'cache-and-network',
  });

  const accessTokenForTodo = useMemo(
    () => readGoogleTokenPayload(tokenQ.data?.getLinkedGoogleAccountToken).accessToken,
    [tokenQ.data?.getLinkedGoogleAccountToken]
  );

  const ws = useTodoWorkspaces(todoAccountId, accessTokenForTodo);
  const googleBoard = useTodoBoard(
    isLocalMode ? null : accessTokenForTodo,
    isLocalMode ? null : ws.activeWorkspaceId
  );
  const localBoard = useTodoLocalBoard(isLocalMode ? ws.activeWorkspaceId : null);

  const board = isLocalMode ? localBoard : googleBoard;

  const selectedLinked = accounts.find((a) => a.googleUserId === todoAccountId);
  const hasTasksScope = isLocalMode || accountHasGoogleTasksScope(selectedLinked?.scopesGranted);

  const openAccounts = () => openApp('settings', { settingsTab: 'Accounts' });

  const onTodoAccountChange = useCallback(
    (id: string | null) => {
      const v = id?.trim() || LOCAL_GOOGLE_USER_ID;
      setPickedTodoAccountId(v);
      writeTodoAccountPicker(v);
      if (v !== LOCAL_GOOGLE_USER_ID) {
        setGoogleUserId(v);
      }
    },
    [setGoogleUserId]
  );

  if (!authed) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Sign in to the desktop to use Todo.
      </div>
    );
  }

  if (linkedLoading && accounts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Loading linked accounts…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 text-white/90">
      <TodoHeader
        activeTab={shellTab}
        onTab={setShellTab}
        accounts={pickerAccounts}
        googleUserId={todoAccountId ?? LOCAL_GOOGLE_USER_ID}
        onGoogleUserId={onTodoAccountChange}
        onOpenSettings={openAccounts}
        workspaces={ws.workspaces}
        activeWorkspaceId={ws.activeWorkspaceId}
        onWorkspaceChange={(id) => ws.setActiveWorkspaceId(id)}
      />

      {isLocalMode ? (
        <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-center text-xs text-white/55 sm:px-6">
          Tasks are saved on this device.{' '}
          <button
            type="button"
            className="text-violet-300 underline-offset-2 hover:underline"
            onClick={openAccounts}
          >
            Link Google in Settings
          </button>{' '}
          to sync with Google Tasks.
        </div>
      ) : null}

      {!isLocalMode && !accessTokenForTodo && tokenQ.loading ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/50">
          Loading account token…
        </div>
      ) : !isLocalMode && !accessTokenForTodo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-amber-200/90">
          <p>No access token. Re-link your Google account in Settings.</p>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10"
            onClick={openAccounts}
          >
            Open Settings → Accounts
          </button>
        </div>
      ) : !hasTasksScope ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/60">
          <p>
            Google Tasks access is required. Re-link your account in Settings → Accounts to grant
            the Tasks scope.
          </p>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/90 hover:bg-white/10"
            onClick={openAccounts}
          >
            Open Settings → Accounts
          </button>
        </div>
      ) : shellTab === 'Workspaces' ? (
        <WorkspacesTab
          workspaces={ws.workspaces}
          loading={ws.loading}
          activeWorkspaceId={ws.activeWorkspaceId}
          createWorkspace={ws.createWorkspace}
          renameWorkspace={ws.renameWorkspace}
          deleteWorkspace={ws.deleteWorkspace}
          isLocalMode={isLocalMode}
        />
      ) : !ws.activeWorkspaceId && ws.loading ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/50">
          Loading workspaces…
        </div>
      ) : !board.listIds && board.busy ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/50">
          {isLocalMode ? 'Loading tasks…' : 'Syncing with Google Tasks…'}
        </div>
      ) : board.listIds ? (
        <BoardTab
          listIds={board.listIds}
          busy={board.busy}
          cards={board.cards}
          onCardsChange={board.onCardsChange}
          onAddCard={board.onAddCard}
          onDeleteCard={board.onDeleteCard}
        />
      ) : !isLocalMode && ws.activeWorkspaceId ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/50">
          Could not load task lists.
        </div>
      ) : (
        <BoardTab
          listIds={null}
          busy={board.busy}
          cards={board.cards}
          onCardsChange={board.onCardsChange}
          onAddCard={board.onAddCard}
          onDeleteCard={board.onDeleteCard}
        />
      )}
    </div>
  );
}
