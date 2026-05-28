'use client';

import { type DragEvent, type FormEvent, useState } from 'react';
import { Flame, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { KanbanListIds, TodoCard, TodoColumn } from '@/lib/todo-format';
import { TODO_COLUMNS } from '@/lib/todo-format';

const COLUMN_META: Record<TodoColumn, { title: string; headingColor: string }> = {
  backlog: { title: 'Backlog', headingColor: 'text-neutral-500' },
  todo: { title: 'TODO', headingColor: 'text-yellow-200' },
  doing: { title: 'In progress', headingColor: 'text-blue-200' },
  done: { title: 'Complete', headingColor: 'text-emerald-200' },
};

export type KanbanProps = {
  listIds: KanbanListIds;
  cards: TodoCard[];
  onCardsChange: (next: TodoCard[], movedCardId: string) => void | Promise<void>;
  onAddCard: (column: TodoColumn, title: string) => void | Promise<void>;
  onDeleteCard: (card: TodoCard) => void | Promise<void>;
  disabled?: boolean;
  onCardClick?: (card: TodoCard) => void;
  selectedCardId?: string | null;
};

export function Kanban({
  listIds,
  cards,
  onCardsChange,
  onAddCard,
  onDeleteCard,
  disabled = false,
  onCardClick,
  selectedCardId = null,
}: KanbanProps) {
  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col bg-slate-950 text-white/90')}>
      <Board
        listIds={listIds}
        cards={cards}
        onCardsChange={onCardsChange}
        onAddCard={onAddCard}
        onDeleteCard={onDeleteCard}
        disabled={disabled}
        onCardClick={onCardClick}
        selectedCardId={selectedCardId}
      />
    </div>
  );
}

type BoardProps = KanbanProps;

const Board = ({
  listIds,
  cards,
  onCardsChange,
  onAddCard,
  onDeleteCard,
  disabled,
  onCardClick,
  selectedCardId,
}: BoardProps) => {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden p-4 md:p-8">
      {TODO_COLUMNS.map((column) => (
        <Column
          key={column}
          listIds={listIds}
          title={COLUMN_META[column].title}
          column={column}
          headingColor={COLUMN_META[column].headingColor}
          cards={cards}
          onCardsChange={onCardsChange}
          onAddCard={onAddCard}
          disabled={disabled}
          onCardClick={onCardClick}
          selectedCardId={selectedCardId}
        />
      ))}
      <BurnBarrel cards={cards} onDeleteCard={onDeleteCard} disabled={disabled} />
    </div>
  );
};

type ColumnProps = {
  listIds: KanbanListIds;
  title: string;
  headingColor: string;
  cards: TodoCard[];
  column: TodoColumn;
  onCardsChange: (next: TodoCard[], movedCardId: string) => void | Promise<void>;
  onAddCard: (column: TodoColumn, title: string) => void | Promise<void>;
  disabled?: boolean;
  onCardClick?: (card: TodoCard) => void;
  selectedCardId?: string | null;
};

const Column = ({
  listIds,
  title,
  headingColor,
  cards,
  column,
  onCardsChange,
  onAddCard,
  disabled,
  onCardClick,
  selectedCardId,
}: ColumnProps) => {
  const [active, setActive] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, card: TodoCard) => {
    if (disabled) return;
    const dt = e.dataTransfer;
    if (!dt) return;
    dt.setData('cardId', card.id);
    dt.effectAllowed = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    const cardId = dt.getData('cardId');
    if (!cardId) return;

    setActive(false);
    clearHighlights(column);

    const indicators = getIndicators(column);
    const { element } = getNearestIndicator(e, indicators);

    const before = element.dataset.before || '-1';

    if (before !== cardId) {
      let copy = [...cards];

      const cardToTransfer = copy.find((c) => c.id === cardId);
      if (!cardToTransfer) return;
      const targetListId = listIds[column];
      const updated: TodoCard = {
        ...cardToTransfer,
        column,
        tasklistId: targetListId,
      };

      copy = copy.filter((c) => c.id !== cardId);
      copy = insertCardIntoCopy(copy, updated, before);

      onCardsChange(copy, cardId);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    highlightIndicator(e, column);

    setActive(true);
  };

  const clearHighlights = (col: TodoColumn, els?: HTMLElement[]) => {
    const indicators = els || getIndicators(col);

    indicators.forEach((i) => {
      i.style.opacity = '0';
    });
  };

  const highlightIndicator = (e: DragEvent<HTMLDivElement>, col: TodoColumn) => {
    const indicators = getIndicators(col);

    clearHighlights(col, indicators);

    const el = getNearestIndicator(e, indicators);

    el.element.style.opacity = '1';
  };

  const handleDragLeave = () => {
    clearHighlights(column);
    setActive(false);
  };

  const filteredCards = cards.filter((c) => c.column === column);

  return (
    <div className="w-56 shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn('font-medium', headingColor)}>{title}</h3>
        <span className="rounded text-sm text-neutral-400">{filteredCards.length}</span>
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex max-h-[calc(100%-2.5rem)] min-h-32 flex-col transition-colors rounded-xl p-1',
          active ? 'bg-white/5' : 'bg-transparent'
        )}
      >
        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto pr-0.5">
          <AnimatePresence mode="popLayout">
            {filteredCards.map((c) => {
              return (
                <Card
                  key={c.id}
                  card={c}
                  handleDragStart={handleDragStart}
                  disabled={disabled}
                  onClick={onCardClick}
                  selected={c.id === selectedCardId}
                />
              );
            })}
          </AnimatePresence>
          <DropIndicator beforeId={null} column={column} />
          <AddCard column={column} onAddCard={onAddCard} disabled={disabled} />
        </div>
      </div>
    </div>
  );
};

type CardProps = {
  card: TodoCard;
  handleDragStart: (e: DragEvent<HTMLDivElement>, card: TodoCard) => void;
  disabled?: boolean;
  onClick?: (card: TodoCard) => void;
  selected?: boolean;
};

const Card = ({ card, handleDragStart, disabled, onClick, selected }: CardProps) => {
  const { title, id, column } = card;
  return (
    <>
      <DropIndicator beforeId={id} column={column} />
      <motion.div
        layout
        layoutId={id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        draggable={!disabled}
        onDragStart={(e) => handleDragStart(e as unknown as DragEvent<HTMLDivElement>, card)}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && onClick?.(card)}
        className={cn(
          'mb-1 cursor-grab rounded-lg border p-3 active:cursor-grabbing transition-all duration-200 shadow-sm hover:shadow-md',
          selected
            ? 'border-violet-500 bg-violet-600/10 shadow-violet-500/15'
            : 'border-white/10 bg-white/5 hover:border-white/20',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        whileDrag={{
          scale: 1.02,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <p className="text-sm text-white/90">{title}</p>
      </motion.div>
    </>
  );
};

type DropIndicatorProps = {
  beforeId: string | null;
  column: TodoColumn;
};

const DropIndicator = ({ beforeId, column }: DropIndicatorProps) => {
  return (
    <div
      data-before={beforeId || '-1'}
      data-column={column}
      className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0"
    />
  );
};

type BurnBarrelProps = {
  cards: TodoCard[];
  onDeleteCard: (card: TodoCard) => void | Promise<void>;
  disabled?: boolean;
};

const BurnBarrel = ({ cards, onDeleteCard, disabled }: BurnBarrelProps) => {
  const [active, setActive] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(true);
  };

  const handleDragLeave = () => {
    setActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (!dt) {
      setActive(false);
      return;
    }
    const cardId = dt.getData('cardId');
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      void onDeleteCard(card);
    }

    setActive(false);
  };

  return (
    <motion.div
      layout
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      animate={{
        scale: active ? 1.05 : 1,
      }}
      className={cn(
        'mt-10 grid h-56 w-56 shrink-0 place-content-center rounded-xl border text-3xl transition-colors duration-200',
        active
          ? 'border-red-500/50 bg-red-500/10 text-red-400'
          : 'border-white/10 bg-white/[0.02] text-white/30'
      )}
    >
      {active ? (
        <Flame className="size-10 animate-bounce text-red-500 fill-red-500" />
      ) : (
        <Trash2 className="size-10 text-white/30" />
      )}
    </motion.div>
  );
};

type AddCardProps = {
  column: TodoColumn;
  onAddCard: (column: TodoColumn, title: string) => void | Promise<void>;
  disabled?: boolean;
};

const AddCard = ({ column, onAddCard, disabled }: AddCardProps) => {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const title = text.trim();
    if (!title.length) return;

    setText('');
    setAdding(false);
    void onAddCard(column, title);
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {adding ? (
          <motion.form
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="mb-1"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              disabled={disabled}
              placeholder="Add new task…"
              className="w-full rounded border border-violet-400/80 bg-violet-500/10 p-3 text-sm text-white placeholder:text-violet-200/60 focus:outline-none disabled:opacity-50"
            />
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-xs text-white/50 transition-colors hover:text-white/80"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={disabled}
                className="flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-xs text-slate-950 transition-colors hover:bg-white/90"
              >
                <span>Add</span>
                <Plus className="size-3.5" />
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            layout
            type="button"
            disabled={disabled}
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-white/45 transition-colors hover:text-white/80 disabled:opacity-50 hover:bg-white/[0.02] rounded-lg"
          >
            <span>Add card</span>
            <Plus className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

/** Insert a card into the flat list at the correct position within its column. */
function insertCardIntoCopy(copy: TodoCard[], updated: TodoCard, before: string): TodoCard[] {
  const col = updated.column;
  if (before !== '-1') {
    const at = copy.findIndex((c) => c.id === before);
    if (at >= 0) {
      copy.splice(at, 0, updated);
      return copy;
    }
  }
  let lastInCol = -1;
  for (let i = 0; i < copy.length; i++) {
    if (copy[i]!.column === col) lastInCol = i;
  }
  if (lastInCol === -1) copy.push(updated);
  else copy.splice(lastInCol + 1, 0, updated);
  return copy;
}

function getNearestIndicator(e: DragEvent<HTMLDivElement>, indicators: HTMLElement[]) {
  const DISTANCE_OFFSET = 50;

  const el = indicators.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();

      const offset = e.clientY - (box.top + DISTANCE_OFFSET);

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    {
      offset: Number.NEGATIVE_INFINITY,
      element: indicators[indicators.length - 1]!,
    }
  );

  return el;
}

function getIndicators(column: TodoColumn) {
  return Array.from(
    document.querySelectorAll(`[data-column="${column}"]`) as unknown as HTMLElement[]
  );
}
