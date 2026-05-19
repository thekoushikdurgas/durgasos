'use client';

import type { ReactNode } from 'react';
import { Check, Edit2, Plus, Trash2 } from 'lucide-react';

export function NavItem({
  icon,
  label,
  active,
  badge,
  actionIcon,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  actionIcon?: ReactNode;
}) {
  return (
    <span
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all group ${
        active
          ? 'bg-indigo-600/10 text-indigo-400 shadow-sm'
          : 'cursor-default text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#e4e4e7]'
      }`}
    >
      <div
        className={`${active ? 'text-indigo-400' : 'text-[#71717a] group-hover:text-[#a1a1aa]'} transition-colors`}
      >
        {icon}
      </div>
      <span className="text-[13px] font-semibold">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-sm">
          {badge}
        </span>
      ) : null}
      {actionIcon && !badge ? (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100">
          {actionIcon}
        </span>
      ) : null}
    </span>
  );
}

export function PromptCard({
  icon,
  iconBg,
  title,
  onClick,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center rounded-[5px] border border-[#27272a] bg-[#09090b] p-3.5 text-left shadow-sm transition-all hover:border-[#3f3f46] hover:bg-[#18181b]"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] ${iconBg}`}>
        {icon}
      </div>
      <span className="ml-3.5 text-[14px] font-semibold text-[#e4e4e7]">{title}</span>
      <Plus className="ml-auto h-4 w-4 text-[#52525b] transition-colors group-hover:text-[#a1a1aa]" />
    </button>
  );
}

export function ProjectCard({
  title,
  desc,
  active,
  onClick,
  isRenaming,
  editTitle,
  onEditTitleChange,
  onRenameSubmit,
  onRenameStart,
  onDelete,
  canEdit,
}: {
  title: string;
  desc: string;
  active?: boolean;
  onClick?: () => void;
  isRenaming?: boolean;
  editTitle?: string;
  onEditTitleChange?: (v: string) => void;
  onRenameSubmit?: () => void;
  onRenameStart?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}) {
  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (isRenaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      onClick={!isRenaming ? onClick : undefined}
      aria-label={isRenaming ? undefined : `Open thread: ${title}`}
      className={`relative flex cursor-pointer items-start rounded-[5px] border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? 'border-[#3f3f46] bg-[#27272a] shadow-sm'
          : 'border-transparent hover:border-[#27272a] hover:bg-[#18181b]'
      } group`}
    >
      <div className="min-w-0 flex-1 pr-6">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              aria-label="Thread title"
              className="w-full rounded border border-[#3f3f46] bg-[#18181b] px-1.5 py-0.5 text-[13px] font-semibold text-white outline-none"
              value={editTitle || ''}
              onChange={(e) => onEditTitleChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit?.();
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              aria-label="Save thread title"
              onClick={(e) => {
                e.stopPropagation();
                onRenameSubmit?.();
              }}
              className="rounded p-1 text-emerald-500 hover:bg-[#3f3f46]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <h4
            className={`truncate text-[13px] ${active ? 'font-semibold text-white' : 'font-medium text-[#a1a1aa] group-hover:text-white'}`}
          >
            {title}
          </h4>
        )}
        <p className="mt-0.5 truncate text-[12px] font-medium text-[#71717a]">{desc}</p>
      </div>

      {!isRenaming && canEdit ? (
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onRenameStart ? (
            <button
              type="button"
              aria-label="Rename thread"
              onClick={(e) => {
                e.stopPropagation();
                onRenameStart?.();
              }}
              className="rounded-md p-1.5 text-[#52525b] transition-colors hover:bg-[#3f3f46] hover:text-[#e4e4e7]"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label="Delete thread"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="rounded-md p-1.5 text-[#52525b] transition-colors hover:bg-red-400/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
