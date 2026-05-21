'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { spring } from 'react-motion';

import { SpringBox } from '@/components/motion/SpringBox';
import { overlaySpring } from '@/lib/motion/spring-presets';
import type { LauncherFilters, LauncherCategoryFilter } from '@/hooks/use-launcher-filters';
import { cn } from '@/lib/utils';

interface DropdownOption {
  value: string;
  label: string;
}

interface LauncherDropdownProps {
  label: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (val: string) => void;
  align?: 'left' | 'right';
}

function LauncherDropdown({
  label,
  options,
  selectedValue,
  onSelect,
  align = 'left',
}: LauncherDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayLabel = selectedOption ? selectedOption.label : label;

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white transition-all',
          'hover:bg-white/5 active:scale-95 duration-100',
          'focus:outline-none focus:ring-2 focus:ring-cyan-400/40',
          isOpen && 'border-white/20 bg-white/5'
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white/55 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <SpringBox
          defaultStyle={{ opacity: 0, scale: 0.95, y: -5 }}
          style={{
            opacity: spring(1, overlaySpring),
            scale: spring(1, overlaySpring),
            y: spring(0, overlaySpring),
          }}
          className={cn(
            'absolute mt-2 min-w-[12rem] max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-md z-[100]',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          )}
          mapStyle={(s) => ({
            opacity: s.opacity,
            transform: `scale(${s.scale ?? 1}) translate3d(0, ${s.y ?? 0}px, 0)`,
          })}
        >
          {options.map((opt) => {
            const active = opt.value === selectedValue;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-white/70 transition-colors',
                  'hover:bg-white/10 hover:text-white',
                  active && 'bg-blue-600/20 text-blue-300 font-semibold'
                )}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </button>
            );
          })}
        </SpringBox>
      )}
    </div>
  );
}

type Props = {
  filters: LauncherFilters;
  onClose: () => void;
  totalCount: number;
  filteredCount: number;
};

export function LauncherToolbar({ filters, onClose, totalCount, filteredCount }: Props) {
  const { query, setQuery, category, setCategory, tag, setTag, categoryOptions, tagOptions } =
    filters;

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-slate-950/40 px-5 py-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="launcher-title" className="text-base font-semibold text-white">
            App launcher
          </h2>
          <p className="text-xs text-white/50">
            {filteredCount} of {totalCount} apps
          </p>
        </div>
        <button
          type="button"
          aria-label="Close app launcher"
          onClick={onClose}
          className="rounded-lg p-2 text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/50"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search apps…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary,#3b82f6)]/50"
            autoFocus
            aria-label="Search applications"
          />
        </div>

        <div className="flex shrink-0 gap-2">
          <LauncherDropdown
            label="Category"
            options={categoryOptions}
            selectedValue={category}
            onSelect={(val) => setCategory(val as LauncherCategoryFilter)}
          />

          <LauncherDropdown
            label="Tag"
            options={tagOptions.map((t) => ({ value: t, label: t === 'all' ? 'All tags' : t }))}
            selectedValue={tag}
            onSelect={setTag}
            align="right"
          />
        </div>
      </div>
    </header>
  );
}
