'use client';

import { cn } from '@/lib/utils';

export function CategoryCard({
  colorClass,
  title,
  count,
  isActive,
  onClick,
}: {
  colorClass: string;
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-44 w-full flex-col justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-violet-500/50',
        'hover:-translate-y-1 hover:border-white/20 hover:shadow-md',
        isActive ? 'border-violet-500/60 shadow-md ring-1 ring-violet-500/30' : ''
      )}
    >
      <div className={`mb-4 h-10 w-10 rounded-2xl ${colorClass}`} />
      <div
        className={cn(
          'mt-2 pr-4 text-lg font-black leading-snug tracking-tight transition-colors',
          isActive ? 'text-violet-300' : 'text-white/90'
        )}
      >
        {title}
      </div>
      <div className="mt-auto text-sm font-bold text-white/45">{count} events</div>
    </button>
  );
}
