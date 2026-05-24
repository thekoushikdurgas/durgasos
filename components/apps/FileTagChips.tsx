'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Color palette for tag chips — cycles deterministically from tag text */
const TAG_COLORS = [
  'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]!;
}

type FileTagChipsProps = {
  tags: string[];
  onRemove?: (tag: string) => void;
  /** Compact: show max 2 tags and "+N more" overflow pill */
  compact?: boolean;
  className?: string;
};

export function FileTagChips({ tags, onRemove, compact = false, className }: FileTagChipsProps) {
  if (tags.length === 0) return null;

  const visible = compact ? tags.slice(0, 2) : tags;
  const overflow = compact ? tags.length - 2 : 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visible.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-medium',
            'text-[9px] leading-none',
            tagColor(tag)
          )}
        >
          {tag}
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag);
              }}
            >
              <X className="h-2 w-2" />
            </button>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full border border-white/10 bg-white/8 px-1.5 py-0.5 text-[9px] leading-none text-white/40">
          +{overflow}
        </span>
      )}
    </div>
  );
}
