'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Check, Plus } from 'lucide-react';

import { DesktopWidgetChrome } from '@/components/widget/DesktopWidgetChrome';
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import { useTodoBoard } from '@/hooks/use-todo-board';
import { useTodoLocalBoard } from '@/hooks/use-todo-local-board';
import { useTodoWorkspaces } from '@/hooks/use-todo-workspaces';
import { GET_LINKED_GOOGLE_ACCOUNT_TOKEN } from '@/lib/graphql-modules';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';
import { LOCAL_GOOGLE_USER_ID, readTodoAccountPicker, type TodoColumn } from '@/lib/todo-format';
import { cn } from '@/lib/utils';
import { useQuery } from '@apollo/client/react';

const COLUMN_LABEL: Record<TodoColumn, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
};

function formatColumnLabel(column: string): string {
  if (column in COLUMN_LABEL) return COLUMN_LABEL[column as TodoColumn];
  return column.replace(/_/g, ' ');
}

function TodoWidgetSkeleton() {
  return (
    <div className="h-36 w-full max-w-[min(100vw-2rem,280px)] animate-pulse rounded-2xl bg-white/10" />
  );
}

export function TodoWidget() {
  const { authed, accounts } = useLinkedGoogleAccount();

  const defaultTodoAccountId = useMemo(() => {
    if (!authed) return null;
    const ids = new Set([LOCAL_GOOGLE_USER_ID, ...accounts.map((a) => a.googleUserId)]);
    const stored = readTodoAccountPicker();
    if (stored && ids.has(stored)) return stored;
    return LOCAL_GOOGLE_USER_ID;
  }, [authed, accounts]);

  const todoAccountId = defaultTodoAccountId;
  const isLocalMode = todoAccountId === LOCAL_GOOGLE_USER_ID;

  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || isLocalMode || !todoAccountId,
    variables: { googleUserId: todoAccountId ?? '' },
  });

  const tokenPayload = useMemo(
    () => readGoogleTokenPayload(tokenQ.data?.getLinkedGoogleAccountToken),
    [tokenQ.data?.getLinkedGoogleAccountToken]
  );

  const accessTokenForTodo = tokenPayload.accessToken;

  const ws = useTodoWorkspaces(todoAccountId, accessTokenForTodo);
  const googleBoard = useTodoBoard(
    isLocalMode ? null : accessTokenForTodo,
    isLocalMode ? null : ws.activeWorkspaceId
  );
  const localBoard = useTodoLocalBoard(isLocalMode ? ws.activeWorkspaceId : null);

  const board = isLocalMode ? localBoard : googleBoard;

  const activeCards = useMemo(
    () => board.cards.filter((c) => c.column !== 'done').slice(0, 6),
    [board.cards]
  );

  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await board.onAddCard('todo', newTitle.trim());
    setNewTitle('');
  };

  const showSkeleton = board.busy && activeCards.length === 0;

  if (showSkeleton) {
    return <TodoWidgetSkeleton />;
  }

  return (
    <DesktopWidgetChrome maxWidthClass="max-w-[min(100vw-2rem,280px)]">
      <ul className="max-h-40 space-y-0 overflow-y-auto [scrollbar-width:thin]">
        {activeCards.length === 0 ? (
          <li className="py-2 text-xs text-white/55">No active tasks — add one below.</li>
        ) : (
          activeCards.map((card) => (
            <li
              key={card.id}
              className="flex items-center gap-2.5 border-t border-white/10 py-2 first:border-t-0 first:pt-0"
            >
              <button
                type="button"
                aria-label={`Mark "${card.title}" done`}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25',
                  'text-transparent transition hover:border-cyan-400/70 hover:text-cyan-300/90'
                )}
                onClick={() => board.onDeleteCard(card)}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </button>
              <span className="min-w-0 flex-1 truncate text-sm text-white/90">{card.title}</span>
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/45">
                {formatColumnLabel(card.column)}
              </span>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={handleAdd} className="flex items-center gap-2 border-t border-white/10 pt-3">
        <input
          type="text"
          placeholder="New task…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className={cn(
            'min-w-0 flex-1 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5',
            'text-xs text-white/90 placeholder:text-white/35',
            'focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/25'
          )}
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15',
            'bg-white/10 text-white/90 transition',
            'hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40'
          )}
          aria-label="Add task"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>
    </DesktopWidgetChrome>
  );
}
