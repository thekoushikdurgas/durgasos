'use client';

import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CREATE_TODO_TASK,
  DELETE_TODO_TASK,
  MOVE_TODO_TASK,
  TODO_TASKS,
} from '@/lib/graphql-modules';
import {
  buildMoveCommit,
  dbTaskToCard,
  localWorkspaceListIds,
  sortCardsForKanban,
  type KanbanListIds,
  type TodoCard,
  type TodoColumn,
} from '@/lib/todo-format';

function notice(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('durgasos-notice', { detail: { message } }));
}

export function useTodoLocalBoard(workspaceId: string | null) {
  const client = useApolloClient();
  const listIds = useMemo<KanbanListIds | null>(
    () => (workspaceId ? localWorkspaceListIds(workspaceId) : null),
    [workspaceId]
  );
  const [cards, setCards] = useState<TodoCard[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setCards([]);
      return;
    }
    setBusy(true);
    try {
      const r = await client.query({
        query: TODO_TASKS,
        variables: { workspaceId },
        fetchPolicy: 'network-only',
      });
      const raw = r.data?.todoTasks;
      if (!Array.isArray(raw)) {
        setCards([]);
        return;
      }
      const next: TodoCard[] = [];
      for (const t of raw) {
        if (!t || typeof t !== 'object') continue;
        const o = t as Record<string, unknown>;
        const id = typeof o.id === 'string' ? o.id : null;
        const title = typeof o.title === 'string' ? o.title : '';
        const column = typeof o.column === 'string' ? o.column : '';
        const wid = typeof o.workspaceId === 'string' ? o.workspaceId : workspaceId;
        if (!id) continue;
        const c = dbTaskToCard({ id, title, column, workspaceId: wid });
        if (c) next.push(c);
      }
      setCards(sortCardsForKanban(next));
    } catch {
      notice('Failed to load tasks.');
      setCards([]);
    } finally {
      setBusy(false);
    }
  }, [workspaceId, client]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const onCardsChange = useCallback(
    async (next: TodoCard[], movedCardId: string) => {
      let prev: TodoCard[] = [];
      const orderedNext = sortCardsForKanban(next);
      setCards((current) => {
        prev = current;
        return orderedNext;
      });
      const diff = buildMoveCommit(prev, orderedNext, movedCardId);
      if (!diff || !workspaceId) {
        if (!diff) setCards(prev);
        return;
      }
      const movedNext = orderedNext.find((c) => c.id === movedCardId);
      if (!movedNext) return;
      try {
        await client.mutate({
          mutation: MOVE_TODO_TASK,
          variables: {
            taskId: movedCardId,
            column: movedNext.column,
            previousTaskId: diff.previousId ?? null,
          },
        });
      } catch {
        setCards(prev);
        notice('Could not move task.');
      }
    },
    [workspaceId, client]
  );

  const onAddCard = useCallback(
    async (column: TodoColumn, title: string) => {
      if (!workspaceId || !listIds) return;
      const pendingId = `pending-${crypto.randomUUID()}`;
      const optimistic: TodoCard = {
        id: pendingId,
        title,
        column,
        tasklistId: listIds[column],
      };
      setCards((prev) => sortCardsForKanban([...prev, optimistic]));
      try {
        const r = await client.mutate({
          mutation: CREATE_TODO_TASK,
          variables: { workspaceId, column, title },
        });
        const created = r.data?.createTodoTask;
        const card = created
          ? dbTaskToCard({
              id: created.id,
              title: created.title,
              column: created.column,
              workspaceId: created.workspaceId,
            })
          : null;
        if (!card) {
          setCards((prev) => prev.filter((c) => c.id !== pendingId));
          notice('Could not create task.');
          return;
        }
        setCards((prev) => sortCardsForKanban(prev.map((c) => (c.id === pendingId ? card : c))));
      } catch {
        setCards((prev) => prev.filter((c) => c.id !== pendingId));
        notice('Could not create task.');
      }
    },
    [workspaceId, listIds, client]
  );

  const onDeleteCard = useCallback(
    async (card: TodoCard) => {
      try {
        await client.mutate({
          mutation: DELETE_TODO_TASK,
          variables: { taskId: card.id },
        });
        setCards((c) => c.filter((x) => x.id !== card.id));
      } catch {
        notice('Could not delete task.');
      }
    },
    [client]
  );

  return {
    listIds,
    cards,
    busy,
    refresh,
    onCardsChange,
    onAddCard,
    onDeleteCard,
  };
}
