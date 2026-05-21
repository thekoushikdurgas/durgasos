'use client';

import { useMemo, useState } from 'react';

import { CategoryCard } from '@/components/apps/calendar/CategoryCard';
import { EventFlipCard } from '@/components/apps/calendar/EventFlipCard';
import {
  calControlGroup,
  calError,
  calGhostBtn,
  calHeadingLg,
  calIconMuted,
  calLinkBold,
  calMonthLabel,
  calMuted,
  calPanel,
  calSearchInput,
} from '@/components/apps/calendar/calendar-theme';
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
          <h1 className={calHeadingLg}>Events</h1>
          <p className={calMuted}>From your Google Calendar (primary)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${calIconMuted}`}
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
              className={calSearchInput}
            />
          </div>
          <div className={calControlGroup}>
            <button
              type="button"
              className={calGhostBtn}
              aria-label="Previous month"
              onClick={onPrevMonth}
            >
              ‹
            </button>
            <span className={calMonthLabel}>{monthLabel}</span>
            <button
              type="button"
              className={calGhostBtn}
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
        <p className="text-sm font-medium text-white/40">Loading events…</p>
      ) : errorMessage ? (
        <p className={calError}>{errorMessage}</p>
      ) : filtered.length === 0 ? (
        <div className={`${calPanel} p-12 text-center`}>
          <p className="text-lg font-medium text-white/50">No events match your filters.</p>
          <button
            type="button"
            className={`mt-2 ${calLinkBold}`}
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
