'use client';

import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { BoardTab } from '@/components/apps/todo/BoardTab';
import { TodoCommentsPanel } from '@/components/apps/todo/TodoCommentsPanel';
import { TodoHeader } from '@/components/apps/todo/TodoHeader';
import { TodoSidebar } from '@/components/apps/todo/TodoSidebar';
import { useOS } from '@/components/os-context';
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import { useTodoBoard } from '@/hooks/use-todo-board';
import { useTodoLocalBoard } from '@/hooks/use-todo-local-board';
import { useTodoWorkspaces } from '@/hooks/use-todo-workspaces';
import { GET_LINKED_GOOGLE_ACCOUNT_TOKEN } from '@/lib/graphql-modules';
import type { LinkedGoogleAccountRow } from '@/lib/linked-google-accounts';
import {
  isGoogleAccessTokenExpired,
  readGoogleTokenPayload,
} from '@/lib/read-google-token-payload';
import {
  accountHasGoogleTasksScope,
  LOCAL_GOOGLE_USER_ID,
  readTodoAccountPicker,
  writeTodoAccountPicker,
  type TodoCard,
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
  const [selectedCard, setSelectedCard] = useState<TodoCard | null>(null);
  const [prevWorkspaceId, setPrevWorkspaceId] = useState<string | null>(null);

  const defaultTodoAccountId = useMemo(() => {
    if (!authed) return null;
    const ids = new Set(pickerAccounts.map((a) => a.googleUserId));
    const stored = readTodoAccountPicker();
    if (stored && ids.has(stored)) return stored;
    return LOCAL_GOOGLE_USER_ID;
  }, [authed, pickerAccounts]);

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

  const tokenPayload = useMemo(
    () => readGoogleTokenPayload(tokenQ.data?.getLinkedGoogleAccountToken),
    [tokenQ.data?.getLinkedGoogleAccountToken]
  );

  const accessTokenForTodo = useMemo(() => {
    const { accessToken, expiresAt } = tokenPayload;
    if (!accessToken) return null;
    if (isGoogleAccessTokenExpired(expiresAt)) return null;
    return accessToken;
  }, [tokenPayload]);

  const switchToLocalDevice = useCallback(() => {
    setPickedTodoAccountId(LOCAL_GOOGLE_USER_ID);
    writeTodoAccountPicker(LOCAL_GOOGLE_USER_ID);
  }, []);

  const ws = useTodoWorkspaces(todoAccountId, accessTokenForTodo);

  if (ws.activeWorkspaceId !== prevWorkspaceId) {
    setPrevWorkspaceId(ws.activeWorkspaceId);
    setSelectedCard(null);
  }
  const googleBoard = useTodoBoard(
    isLocalMode ? null : accessTokenForTodo,
    isLocalMode ? null : ws.activeWorkspaceId,
    isLocalMode ? undefined : switchToLocalDevice
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

  const activeWorkspace = useMemo(() => {
    return ws.workspaces.find((w) => w.id === ws.activeWorkspaceId) || null;
  }, [ws.workspaces, ws.activeWorkspaceId]);

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
    <div className="flex h-full w-full overflow-hidden bg-slate-950 text-white/90">
      <TodoSidebar
        workspaces={ws.workspaces}
        loading={ws.loading}
        activeWorkspaceId={ws.activeWorkspaceId}
        onWorkspaceSelect={(id) => ws.setActiveWorkspaceId(id)}
        createWorkspace={ws.createWorkspace}
        renameWorkspace={ws.renameWorkspace}
        deleteWorkspace={ws.deleteWorkspace}
        accounts={pickerAccounts}
        googleUserId={todoAccountId ?? LOCAL_GOOGLE_USER_ID}
        onGoogleUserId={onTodoAccountChange}
        onOpenSettings={openAccounts}
        isLocalMode={isLocalMode}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TodoHeader
          activeWorkspaceName={activeWorkspace?.name ?? null}
          onOpenSettings={openAccounts}
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

        <div className="flex-1 min-h-0 overflow-hidden flex">
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {!isLocalMode && !accessTokenForTodo && tokenQ.loading ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-white/50">
                Loading account token…
              </div>
            ) : !isLocalMode && !accessTokenForTodo ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-amber-200/90">
                <p>No access token. Re-link your Google account in Settings.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10"
                    onClick={openAccounts}
                  >
                    Open Settings → Accounts
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-violet-400/40 px-4 py-2 text-xs text-violet-200 hover:bg-violet-500/10"
                    onClick={switchToLocalDevice}
                  >
                    Use On this device
                  </button>
                </div>
              </div>
            ) : !hasTasksScope ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/60">
                <p>
                  Google Tasks access is required. Re-link your account in Settings → Accounts to
                  grant the Tasks scope.
                </p>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/90 hover:bg-white/10"
                  onClick={openAccounts}
                >
                  Open Settings → Accounts
                </button>
              </div>
            ) : !ws.activeWorkspaceId && ws.loading ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-white/50">
                Loading workspaces…
              </div>
            ) : !board.listIds && board.busy ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-white/50">
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
                onCardClick={(card) => setSelectedCard(card)}
                selectedCardId={selectedCard?.id}
              />
            ) : !isLocalMode && ws.activeWorkspaceId ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-white/50">
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
                onCardClick={(card) => setSelectedCard(card)}
                selectedCardId={selectedCard?.id}
              />
            )}
          </div>
          <TodoCommentsPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
        </div>
      </div>
    </div>
  );
}
