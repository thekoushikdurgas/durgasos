'use client';

import { useMemo, useState } from 'react';

import { CategoryCard } from '@/components/apps/calendar/CategoryCard';
import { EventFlipCard } from '@/components/apps/calendar/EventFlipCard';
import {
  CALENDAR_CATEGORY_ORDER,
  type CalendarCategoryFilter,
  type CalendarEventView,
  countByCategory,
} from '@/lib/calendar-format';
const CATEGORY_STYLES: Record<
  Exclude<CalendarCategoryFilter, 'Other'>,
  { colorClass: string; title: string }
> = {
  Designers: { colorClass: 'bg-rose-500', title: 'Designers' },
  Corporate: { colorClass: 'bg-blue-500', title: 'Corporate' },
  'Tech Stack': { colorClass: 'bg-emerald-500', title: 'Tech Stack' },
  Entertainment: { colorClass: 'bg-amber-500', title: 'Entertainment' },
};

export function EventsTab({
  events,
  loading,
  errorMessage,
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: {
  events: CalendarEventView[];
  loading: boolean;
  errorMessage: string | null;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<CalendarCategoryFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => countByCategory(events), [events]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      const catOk = activeCategory ? e.category === activeCategory : true;
      const searchOk =
        !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [events, activeCategory, searchQuery]);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Events</h1>
          <p className="font-medium text-slate-500">From your Google Calendar (primary)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search events…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-[12rem] rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-64"
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
              aria-label="Previous month"
              onClick={onPrevMonth}
            >
              ‹
            </button>
            <span className="min-w-[8rem] text-center text-sm font-bold text-slate-700">
              {monthLabel}
            </span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
              aria-label="Next month"
              onClick={onNextMonth}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
        {CALENDAR_CATEGORY_ORDER.map((key) => {
          const cfg = CATEGORY_STYLES[key];
          return (
            <CategoryCard
              key={key}
              colorClass={cfg.colorClass}
              title={cfg.title}
              count={counts[key]}
              isActive={activeCategory === key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
            />
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm font-medium text-slate-400">Loading events…</p>
      ) : errorMessage ? (
        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-slate-500">No events match your filters.</p>
          <button
            type="button"
            className="mt-2 font-bold text-indigo-600 hover:underline"
            onClick={() => {
              setActiveCategory(null);
              setSearchQuery('');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((e) => (
            <EventFlipCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
