export type TodoColumn = 'backlog' | 'todo' | 'doing' | 'done';

export const TODO_COLUMNS: readonly TodoColumn[] = ['backlog', 'todo', 'doing', 'done'] as const;

/** Kanban drag/drop expects cards grouped in column display order (not DB column name order). */
export function sortCardsForKanban(cards: TodoCard[]): TodoCard[] {
  const out: TodoCard[] = [];
  for (const col of TODO_COLUMNS) {
    out.push(...cards.filter((c) => c.column === col));
  }
  return out;
}

export type TodoCard = {
  id: string;
  title: string;
  column: TodoColumn;
  tasklistId: string;
};

export type KanbanListIds = Record<TodoColumn, string>;

/** Picker value for device-local Todo (no Google Tasks sync). */
export const LOCAL_GOOGLE_USER_ID = '__local__' as const;

export type TodoWorkspaceStorage = 'google' | 'local';

const TODO_ACCOUNT_PICKER_KEY = 'durgasos-todo-account';

export function readTodoAccountPicker(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(TODO_ACCOUNT_PICKER_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function writeTodoAccountPicker(googleUserId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (googleUserId) window.localStorage.setItem(TODO_ACCOUNT_PICKER_KEY, googleUserId);
    else window.localStorage.removeItem(TODO_ACCOUNT_PICKER_KEY);
  } catch {
    /* ignore */
  }
}

export function localWorkspaceListIds(workspaceId: string): KanbanListIds {
  return {
    backlog: `${workspaceId}:backlog`,
    todo: `${workspaceId}:todo`,
    doing: `${workspaceId}:doing`,
    done: `${workspaceId}:done`,
  };
}

function isTodoColumn(s: string): s is TodoColumn {
  return s === 'backlog' || s === 'todo' || s === 'doing' || s === 'done';
}

/** Map a `todoTasks` GraphQL row to a Kanban card. */
export function dbTaskToCard(task: {
  id: string;
  title: string;
  column: string;
  workspaceId: string;
}): TodoCard | null {
  if (!isTodoColumn(task.column)) return null;
  const col = task.column;
  return {
    id: task.id,
    title: task.title,
    column: col,
    tasklistId: `${task.workspaceId}:${col}`,
  };
}

/** Row from `todoWorkspaces` GraphQL query. */
export type TodoWorkspaceRow = {
  id: string;
  name: string;
  storage: TodoWorkspaceStorage;
  googleUserId: string;
  backlogListId: string;
  todoListId: string;
  doingListId: string;
  doneListId: string;
  createdAt: string;
  updatedAt: string;
};

export function workspaceToKanbanListIds(w: TodoWorkspaceRow): KanbanListIds {
  if (w.storage === 'local') {
    return localWorkspaceListIds(w.id);
  }
  return {
    backlog: w.backlogListId,
    todo: w.todoListId,
    doing: w.doingListId,
    done: w.doneListId,
  };
}

export const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';

export function accountHasGoogleTasksScope(scopesGranted: string | null | undefined): boolean {
  const s = (scopesGranted ?? '').trim();
  if (!s) return false;
  return s.includes(TASKS_SCOPE) || s.includes('/auth/tasks');
}

export function coerceJsonRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function coerceEnsureKanbanPayload(raw: unknown): {
  success: boolean;
  backlogListId: string;
  todoListId: string;
  doingListId: string;
  doneListId: string;
} | null {
  const o = coerceJsonRecord(raw);
  if (!o || o.success !== true) return null;
  const b = o.backlogListId ?? o.backlog_list_id;
  const t = o.todoListId ?? o.todo_list_id;
  const d = o.doingListId ?? o.doing_list_id;
  const dn = o.doneListId ?? o.done_list_id;
  if (
    typeof b === 'string' &&
    typeof t === 'string' &&
    typeof d === 'string' &&
    typeof dn === 'string' &&
    b &&
    t &&
    d &&
    dn
  ) {
    return {
      success: true,
      backlogListId: b,
      todoListId: t,
      doingListId: d,
      doneListId: dn,
    };
  }
  return null;
}

export function coerceListTasksItems(raw: unknown): unknown[] {
  const o = coerceJsonRecord(raw);
  if (!o || o.success !== true) return [];
  const items = o.items;
  return Array.isArray(items) ? items : [];
}

export function googleTaskToCard(
  task: Record<string, unknown>,
  column: TodoColumn,
  tasklistId: string
): TodoCard | null {
  const id = typeof task.id === 'string' ? task.id : null;
  const title = typeof task.title === 'string' ? task.title : '';
  if (!id) return null;
  return { id, title, column, tasklistId };
}

export function cardsFromListPayload(
  column: TodoColumn,
  tasklistId: string,
  raw: unknown
): TodoCard[] {
  const items = coerceListTasksItems(raw);
  const out: TodoCard[] = [];
  for (const it of items) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
    const c = googleTaskToCard(it as Record<string, unknown>, column, tasklistId);
    if (c) out.push(c);
  }
  return out;
}

export function coerceInsertTaskPayload(raw: unknown): { id: string; title: string } | null {
  const o = coerceJsonRecord(raw);
  if (!o || o.success !== true) return null;
  const task = o.task;
  if (!task || typeof task !== 'object' || Array.isArray(task)) return null;
  const t = task as Record<string, unknown>;
  const id = typeof t.id === 'string' ? t.id : null;
  const title = typeof t.title === 'string' ? t.title : '';
  if (!id) return null;
  return { id, title };
}

export type MoveCommit = {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  previousId: string | null;
};

/** Build Google Tasks `move` params using the card that was dragged (drop source id). */
export function buildMoveCommit(
  prev: TodoCard[],
  next: TodoCard[],
  movedCardId: string
): MoveCommit | null {
  const movedPrev = prev.find((c) => c.id === movedCardId);
  const movedNext = next.find((c) => c.id === movedCardId);
  if (!movedPrev || !movedNext) return null;
  const inCol = next.filter((x) => x.column === movedNext.column);
  const idx = inCol.findIndex((x) => x.id === movedCardId);
  // Google Tasks: `previous` must be a sibling in the destination list (not the moved task).
  let previousId: string | null = null;
  if (idx > 0) {
    const prevCard = inCol[idx - 1]!;
    if (prevCard.id !== movedCardId && prevCard.tasklistId === movedNext.tasklistId) {
      previousId = prevCard.id;
    }
  }
  if (movedPrev.column === movedNext.column && movedPrev.tasklistId === movedNext.tasklistId) {
    const oldCol = prev.filter((c) => c.column === movedNext.column).map((c) => c.id);
    const newCol = inCol.map((c) => c.id);
    if (oldCol.join(',') === newCol.join(',')) return null;
  }
  return {
    taskId: movedCardId,
    sourceListId: movedPrev.tasklistId,
    targetListId: movedNext.tasklistId,
    previousId,
  };
}
