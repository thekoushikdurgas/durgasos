'use client';

import { useMemo } from 'react';

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
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Planning</h1>
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

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : (
        <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
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
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/80 text-sm font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50/60"
                >
                  <span>{c.day}</span>
                  {c.count > 0 ? (
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500"
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
