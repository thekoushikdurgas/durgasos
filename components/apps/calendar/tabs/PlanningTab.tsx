'use client';

import { useMemo } from 'react';

import {
  calControlGroup,
  calError,
  calGhostBtn,
  calHeadingLg,
  calMonthLabel,
  calPanel,
  calWeekdayHeader,
} from '@/components/apps/calendar/calendar-theme';
import type { CalendarEventView } from '@/lib/calendar-format';
import { eventsPerDayKeys, localDateKey } from '@/lib/calendar-format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PlanningTab({
  viewMonth,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  events,
  loading,
  errorMessage,
  onPickDay,
}: {
  viewMonth: Date;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  events: CalendarEventView[];
  loading: boolean;
  errorMessage: string | null;
  onPickDay: (d: Date) => void;
}) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const perDay = useMemo(() => eventsPerDayKeys(events), [events]);

  const cells = useMemo(() => {
    const out: { key: string; day: number | null; count: number }[] = [];
    for (let i = 0; i < firstDow; i++) {
      out.push({ key: `pad-${i}`, day: null, count: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const k = localDateKey(dt);
      out.push({ key: k, day: d, count: perDay.get(k) ?? 0 });
    }
    return out;
  }, [firstDow, daysInMonth, year, month, perDay]);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <h1 className={calHeadingLg}>Planning</h1>
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

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : errorMessage ? (
        <p className={calError}>{errorMessage}</p>
      ) : (
        <div className={`p-4 sm:p-6 ${calPanel}`}>
          <div className={calWeekdayHeader}>
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((c) =>
              c.day == null ? (
                <div key={c.key} className="aspect-square rounded-2xl bg-transparent" />
              ) : (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onPickDay(new Date(year, month, c.day!))}
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/90 outline-none transition hover:border-violet-500/40 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <span>{c.day}</span>
                  {c.count > 0 ? (
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-400"
                      title={`${c.count} events`}
                    />
                  ) : null}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
