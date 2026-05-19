'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

import type { CalendarEventView } from '@/lib/calendar-format';
import { cn } from '@/lib/utils';

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

export function EventFlipCard({ event }: { event: CalendarEventView }) {
  const [flipped, setFlipped] = useState(false);
  const preview = event.attendees.slice(0, 4);

  return (
    <div
      className="perspective-1000 relative h-[320px] w-full cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => setFlipped(!flipped)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlipped(!flipped);
        }
      }}
      aria-label={`Event: ${event.title}`}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, type: 'spring', stiffness: 260, damping: 26 }}
        className="preserve-3d relative h-full w-full"
      >
        <div
          className={cn(
            'backface-hidden absolute inset-0 flex flex-col rounded-[2.5rem] border border-white bg-white p-6 shadow-xl shadow-slate-200/50'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black leading-none text-indigo-600">
              {event.dayOfMonth}
            </div>
            <div className="mt-1 leading-tight">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {event.weekdayShort}
              </p>
              <p className="text-xs font-bold text-slate-900">{event.monthYearLabel}</p>
            </div>
          </div>
          <div className="mb-4 mt-6">
            <h3 className="mb-2 text-xl font-black leading-tight text-slate-900">{event.title}</h3>
            <p className="text-sm font-medium text-slate-400">{event.timeLabel}</p>
          </div>
          <div className="mt-auto flex items-center -space-x-2">
            {preview.length === 0 ? (
              <span className="z-10 w-full pl-2 text-xs text-slate-400">No attendees listed</span>
            ) : (
              preview.map((a, i) => (
                <div
                  key={`${a.email ?? a.displayName ?? i}-${i}`}
                  title={a.displayName || a.email || ''}
                  className={cn(
                    'z-[3] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[10px] font-bold text-indigo-700',
                    i === 1 && 'z-[2]',
                    i === 2 && 'z-[1]',
                    i >= 3 && 'z-0'
                  )}
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                >
                  {initials(a.displayName || a.email || '?')}
                </div>
              ))
            )}
            {event.attendees.length > preview.length ? (
              <div className="z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500 shadow-sm">
                +{event.attendees.length - preview.length}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="backface-hidden absolute inset-0 flex flex-col justify-center gap-4 rounded-[2.5rem] bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-300/40"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div>
            <h3 className="mb-2 text-[22px] font-black tracking-tight">{event.category}</h3>
            <p className="text-sm font-medium leading-relaxed text-indigo-100">
              {event.description.trim() ? event.description.slice(0, 280) : 'No description.'}
              {event.description.length > 280 ? '…' : ''}
            </p>
          </div>
          {event.htmlLink ? (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 w-full rounded-xl bg-white py-3 text-center text-sm font-bold text-indigo-600 hover:bg-slate-50"
              onClick={(e) => e.stopPropagation()}
            >
              Open in Google Calendar
            </a>
          ) : (
            <p className="text-xs text-indigo-200/90">No web link for this event.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
