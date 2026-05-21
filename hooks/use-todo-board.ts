'use client';

import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useState } from 'react';

import {
  GOOGLE_TASKS_DELETE_TASK,
  GOOGLE_TASKS_ENSURE_KANBAN_LISTS,
  GOOGLE_TASKS_INSERT_TASK,
  GOOGLE_TASKS_LIST_TASKS,
  GOOGLE_TASKS_MOVE_TASK,
} from '@/lib/graphql-modules';
import {
  buildMoveCommit,
  cardsFromListPayload,
  coerceEnsureKanbanPayload,
  coerceInsertTaskPayload,
  type KanbanListIds,
  type TodoCard,
  type TodoColumn,
  TODO_COLUMNS,
  sortCardsForKanban,
} from '@/lib/todo-format';

function notice(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('durgasos-notice', { detail: { message } }));
}

function isGoogleAuthGraphQlError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { graphQLErrors?: { message?: string }[]; message?: string };
  const text = [err.message, ...(err.graphQLErrors?.map((g) => g.message) ?? [])]
    .filter(Boolean)
    .join(' ');
  return /401|UNAUTHENTICATED|invalid authentication credentials/i.test(text);
}

export function useTodoBoard(
  accessToken: string | null,
  workspaceId: string | null,
  onAuthError?: () => void
) {
  const client = useApolloClient();
  const [listIds, setListIds] = useState<KanbanListIds | null>(null);
  const [cards, setCards] = useState<TodoCard[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken || !workspaceId) {
      setListIds(null);
      setCards([]);
      return;
    }
    setBusy(true);
    try {
      const ens = await client.query({
        query: GOOGLE_TASKS_ENSURE_KANBAN_LISTS,
        variables: {
          params: { access_token: accessToken, workspace_id: workspaceId },
        },
        fetchPolicy: 'network-only',
      });
      const p = coerceEnsureKanbanPayload(ens.data?.googleTasksEnsureKanbanLists);
      if (!p) {
        notice('Could not set up Google Tasks lists. Check Tasks permission and try again.');
        return;
      }
      const ids: KanbanListIds = {
        backlog: p.backlogListId,
        todo: p.todoListId,
        doing: p.doingListId,
        done: p.doneListId,
      };
      setListIds(ids);

      const chunks = await Promise.all(
        TODO_COLUMNS.map(async (col) => {
          const tasklistId = ids[col];
          const r = await client.query({
            query: GOOGLE_TASKS_LIST_TASKS,
            variables: {
              params: {
                access_token: accessToken,
                tasklist_id: tasklistId,
                show_completed: true,
                show_deleted: false,
              },
            },
            fetchPolicy: 'network-only',
          });
          return cardsFromListPayload(col, tasklistId, r.data?.googleTasksListTasks);
        })
      );
      setCards(chunks.flat());
    } catch (e) {
      const authFail = isGoogleAuthGraphQlError(e);
      if (authFail) onAuthError?.();
      notice('Failed to load tasks.');
    } finally {
      setBusy(false);
    }
  }, [accessToken, workspaceId, client, onAuthError]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const onCardsChange = useCallback(
    async (next: TodoCard[], movedCardId: string) => {
      const orderedNext = sortCardsForKanban(next);
      let prev: TodoCard[] = [];
      setCards((current) => {
        prev = current;
        return orderedNext;
      });
      const diff = buildMoveCommit(prev, orderedNext, movedCardId);
      if (!diff || !accessToken) {
        if (!diff) setCards(prev);
        return;
      }
      try {
        const params: Record<string, unknown> = {
          access_token: accessToken,
          tasklist_id: diff.sourceListId,
          task_id: diff.taskId,
        };
        if (diff.sourceListId !== diff.targetListId) {
          params.destination_tasklist = diff.targetListId;
        }
        if (diff.previousId) {
          params.previous = diff.previousId;
        }
        await client.mutate({
          mutation: GOOGLE_TASKS_MOVE_TASK,
          variables: { params },
        });
      } catch {
        setCards(prev);
        notice('Could not move task.');
      }
    },
    [accessToken, client]
  );

  const onAddCard = useCallback(
    async (column: TodoColumn, title: string) => {
      if (!accessToken || !listIds) return;
      const tasklistId = listIds[column];
      try {
        const r = await client.mutate({
          mutation: GOOGLE_TASKS_INSERT_TASK,
          variables: {
            params: {
              access_token: accessToken,
              tasklist_id: tasklistId,
              title,
            },
          },
        });
        const t = coerceInsertTaskPayload(r.data?.googleTasksInsertTask);
        if (!t) {
          await refresh();
          return;
        }
        setCards((c) => [...c, { id: t.id, title: t.title || title, column, tasklistId }]);
      } catch {
        notice('Could not create task.');
      }
    },
    [accessToken, listIds, client, refresh]
  );

  const onDeleteCard = useCallback(
    async (card: TodoCard) => {
      if (!accessToken) return;
      try {
        await client.mutate({
          mutation: GOOGLE_TASKS_DELETE_TASK,
          variables: {
            params: {
              access_token: accessToken,
              tasklist_id: card.tasklistId,
              task_id: card.id,
            },
          },
        });
        setCards((c) => c.filter((x) => x.id !== card.id));
      } catch {
        notice('Could not delete task.');
      }
    },
    [accessToken, client]
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
