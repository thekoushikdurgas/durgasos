'use client';

import { useMemo } from 'react';

import type { CalendarEventView } from '@/lib/calendar-format';
import { eventStartDate } from '@/lib/calendar-format';

export function TodayTab({
  focusDay,
  onChangeFocusDay,
  events,
  loading,
  errorMessage,
}: {
  focusDay: Date;
  onChangeFocusDay: (d: Date) => void;
  events: CalendarEventView[];
  loading: boolean;
  errorMessage: string | null;
}) {
  const sorted = useMemo(() => {
    return [...events].sort((a, b) => a.startRaw.localeCompare(b.startRaw));
  }, [events]);

  const label = focusDay.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Today</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500" htmlFor="today-date">
            Date
          </label>
          <input
            id="today-date"
            type="date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm"
            value={focusDay.toISOString().slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m, d] = v.split('-').map(Number);
              if (y && m && d) onChangeFocusDay(new Date(y, m - 1, d));
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:flex-row sm:p-10">
        <div className="w-full shrink-0 space-y-4 border-slate-100 sm:w-1/3 sm:border-r sm:pr-8">
          <p className="text-sm font-bold text-indigo-600">{label}</p>
          <p className="text-xs font-medium text-slate-400">
            Events are loaded for the selected day from your primary Google calendar.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-slate-500">No events this day.</p>
          ) : (
            sorted.map((e) => {
              const sd = eventStartDate(e);
              const time =
                e.allDay || !sd
                  ? 'All day'
                  : sd.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <span className="w-16 shrink-0 text-xs font-bold text-slate-500">{time}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{e.title}</p>
                    {e.htmlLink ? (
                      <a
                        href={e.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
