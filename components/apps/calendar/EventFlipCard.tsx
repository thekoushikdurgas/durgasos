'use client';

import { useState } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import type { CalendarEventView } from '@/lib/calendar-format';
import { pressSpring } from '@/lib/motion/spring-presets';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
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
  const flipStyle = useReducedMotionStyle({ rotateY: flipped ? 180 : 0 }, pressSpring);

  return (
    <div
      className="perspective-1000 relative h-[320px] w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
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
      <SpringBox
        style={flipStyle}
        className="preserve-3d relative h-full w-full"
        mapStyle={(s) => ({
          transform: `rotateY(${s.rotateY ?? 0}deg)`,
          transformStyle: 'preserve-3d',
        })}
      >
        <div
          className={cn(
            'backface-hidden absolute inset-0 flex flex-col rounded-[2.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-inner'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black leading-none text-violet-300">
              {event.dayOfMonth}
            </div>
            <div className="mt-1 leading-tight">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {event.weekdayShort}
              </p>
              <p className="text-xs font-bold text-white/90">{event.monthYearLabel}</p>
            </div>
          </div>
          <div className="mb-4 mt-6">
            <h3 className="mb-2 text-xl font-black leading-tight text-white/95">{event.title}</h3>
            <p className="text-sm font-medium text-white/45">{event.timeLabel}</p>
          </div>
          <div className="mt-auto flex items-center -space-x-2">
            {preview.length === 0 ? (
              <span className="z-10 w-full pl-2 text-xs text-white/45">No attendees listed</span>
            ) : (
              preview.map((a, i) => (
                <div
                  key={`${a.email ?? a.displayName ?? i}-${i}`}
                  title={a.displayName || a.email || ''}
                  className={cn(
                    'z-[3] flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-violet-500/20 text-[10px] font-bold text-violet-100',
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
              <div className="z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-white/10 text-[10px] font-bold text-white/60 shadow-sm">
                +{event.attendees.length - preview.length}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="backface-hidden absolute inset-0 flex flex-col justify-center gap-4 rounded-[2.5rem] bg-gradient-to-br from-violet-700 to-violet-950 p-8 text-white shadow-inner"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div>
            <h3 className="mb-2 text-[22px] font-black tracking-tight">{event.category}</h3>
            <p className="text-sm font-medium leading-relaxed text-violet-100/95">
              {event.description.trim() ? event.description.slice(0, 280) : 'No description.'}
              {event.description.length > 280 ? '…' : ''}
            </p>
          </div>
          {event.htmlLink ? (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 w-full rounded-xl bg-white py-3 text-center text-sm font-bold text-violet-800 hover:bg-violet-50"
              onClick={(e) => e.stopPropagation()}
            >
              Open in Google Calendar
            </a>
          ) : (
            <p className="text-xs text-violet-200/90">No web link for this event.</p>
          )}
        </div>
      </SpringBox>
    </div>
  );
}
