/** Google Calendar primary list → normalized rows for CLNDR-style UI. */

export type CalendarEventView = {
  id: string;
  title: string;
  description: string;
  htmlLink: string | null;
  /** RFC3339 or YYYY-MM-DD */
  startRaw: string;
  endRaw: string;
  allDay: boolean;
  /** One of four CLNDR-style buckets + Other */
  category: 'Designers' | 'Corporate' | 'Tech Stack' | 'Entertainment' | 'Other';
  colorId: string | null;
  /** For flip card front */
  dayOfMonth: string;
  monthYearLabel: string;
  weekdayShort: string;
  timeLabel: string;
  attendees: Array<{ displayName?: string; email?: string }>;
};

export const CALENDAR_CATEGORY_ORDER = [
  'Designers',
  'Corporate',
  'Tech Stack',
  'Entertainment',
] as const;

export type CalendarCategoryFilter = (typeof CALENDAR_CATEGORY_ORDER)[number] | 'Other';

export type CalendarListPayload = {
  success?: boolean;
  items?: Array<Record<string, unknown>>;
  nextPageToken?: string | null;
};

export function coerceCalendarListPayload(raw: unknown): CalendarListPayload | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw) as unknown;
      return typeof v === 'object' && v != null ? (v as CalendarListPayload) : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') return raw as CalendarListPayload;
  return undefined;
}

export function rfc3339DayStart(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export function rfc3339DayEnd(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

/** First instant of month (local) → RFC3339 UTC */
export function rfc3339MonthStart(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  return x.toISOString();
}

/** Last instant of month (local) → RFC3339 UTC */
export function rfc3339MonthEnd(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return x.toISOString();
}

function bucketFromColorId(colorId: string | null): CalendarCategoryFilter {
  if (!colorId) return 'Other';
  const n = parseInt(colorId, 10);
  if (!Number.isFinite(n)) return 'Other';
  const m = (((n - 1) % 4) + 4) % 4;
  return CALENDAR_CATEGORY_ORDER[m]!;
}

function parseWhen(
  when: Record<string, unknown> | undefined
): { raw: string; allDay: boolean; date: Date } | null {
  if (!when) return null;
  if (typeof when.dateTime === 'string') {
    const d = new Date(when.dateTime);
    if (!Number.isNaN(d.getTime())) return { raw: when.dateTime, allDay: false, date: d };
  }
  if (typeof when.date === 'string') {
    const [y, mo, da] = when.date.split('-').map(Number);
    if (y && mo && da) {
      const d = new Date(y, mo - 1, da, 12, 0, 0, 0);
      return { raw: when.date, allDay: true, date: d };
    }
  }
  return null;
}

export function parseCalendarEvent(raw: Record<string, unknown>): CalendarEventView | null {
  const id = typeof raw.id === 'string' ? raw.id : null;
  if (!id) return null;
  const title = typeof raw.summary === 'string' ? raw.summary : '(no title)';
  const description =
    typeof raw.description === 'string'
      ? raw.description
      : typeof raw.summary === 'string'
        ? ''
        : '';
  const htmlLink = typeof raw.htmlLink === 'string' ? raw.htmlLink : null;
  const colorId = typeof raw.colorId === 'string' ? raw.colorId : null;
  const category = bucketFromColorId(colorId);

  const start = parseWhen(raw.start as Record<string, unknown> | undefined);
  if (!start) return null;
  const endWhen = parseWhen(raw.end as Record<string, unknown> | undefined);
  const endRaw = endWhen?.raw ?? start.raw;

  const d = start.date;
  const dayOfMonth = String(d.getDate());
  const monthYearLabel = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const weekdayShort = d.toLocaleString(undefined, { weekday: 'long' }).toLowerCase();

  let timeLabel = 'All day';
  if (!start.allDay) {
    timeLabel = `Starts at ${d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  const attendees: Array<{ displayName?: string; email?: string }> = [];
  const atts = raw.attendees;
  if (Array.isArray(atts)) {
    for (const a of atts) {
      if (!a || typeof a !== 'object') continue;
      const o = a as Record<string, unknown>;
      const email = typeof o.email === 'string' ? o.email : undefined;
      const displayName = typeof o.displayName === 'string' ? o.displayName : undefined;
      if (email || displayName) attendees.push({ email, displayName });
    }
  }

  return {
    id,
    title,
    description,
    htmlLink,
    startRaw: start.raw,
    endRaw,
    allDay: start.allDay,
    category,
    colorId,
    dayOfMonth,
    monthYearLabel,
    weekdayShort,
    timeLabel,
    attendees,
  };
}

export function parseCalendarItems(items: Array<Record<string, unknown>>): CalendarEventView[] {
  const out: CalendarEventView[] = [];
  for (const row of items) {
    const ev = parseCalendarEvent(row);
    if (ev) out.push(ev);
  }
  out.sort((a, b) => a.startRaw.localeCompare(b.startRaw));
  return out;
}

export function countByCategory(
  events: CalendarEventView[]
): Record<CalendarCategoryFilter, number> {
  const acc: Record<string, number> = {
    Designers: 0,
    Corporate: 0,
    'Tech Stack': 0,
    Entertainment: 0,
    Other: 0,
  };
  for (const e of events) {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
  }
  return acc as Record<CalendarCategoryFilter, number>;
}

/** Local date key YYYY-MM-DD for aggregation */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eventStartDate(ev: CalendarEventView): Date | null {
  if (ev.allDay) {
    const [y, mo, da] = ev.startRaw.split('-').map(Number);
    if (y && mo && da) return new Date(y, mo - 1, da, 12, 0, 0, 0);
    return null;
  }
  const d = new Date(ev.startRaw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function eventsPerDayKeys(events: CalendarEventView[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of events) {
    const d = eventStartDate(e);
    if (!d) continue;
    const key = localDateKey(d);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
