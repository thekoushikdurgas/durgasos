'use client';

import { Kanban } from '@/components/ui/kanban';
import type { KanbanListIds, TodoCard, TodoColumn } from '@/lib/todo-format';

type BoardTabProps = {
  listIds: KanbanListIds | null;
  busy: boolean;
  cards: TodoCard[];
  onCardsChange: (next: TodoCard[], movedCardId: string) => void | Promise<void>;
  onAddCard: (column: TodoColumn, title: string) => void | Promise<void>;
  onDeleteCard: (card: TodoCard) => void | Promise<void>;
  onCardClick?: (card: TodoCard) => void;
  selectedCardId?: string | null;
};

export function BoardTab({
  listIds,
  busy,
  cards,
  onCardsChange,
  onAddCard,
  onDeleteCard,
  onCardClick,
  selectedCardId,
}: BoardTabProps) {
  if (!listIds) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/50">
        Select or create a workspace to see the board.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <Kanban
        listIds={listIds}
        cards={cards}
        onCardsChange={onCardsChange}
        onAddCard={onAddCard}
        onDeleteCard={onDeleteCard}
        disabled={busy}
        onCardClick={onCardClick}
        selectedCardId={selectedCardId}
      />
    </div>
  );
}
