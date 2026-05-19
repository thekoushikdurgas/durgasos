'use client';

import { useQuery } from '@apollo/client/react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';

import { CalendarHeader, type CalendarShellTab } from '@/components/apps/calendar/CalendarHeader';
import { ContactsTab } from '@/components/apps/calendar/tabs/ContactsTab';
import { EventsTab } from '@/components/apps/calendar/tabs/EventsTab';
import { PlanningTab } from '@/components/apps/calendar/tabs/PlanningTab';
import { TodayTab } from '@/components/apps/calendar/tabs/TodayTab';
import { useOS } from '@/components/os-context';
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import {
  coerceCalendarListPayload,
  parseCalendarItems,
  rfc3339DayEnd,
  rfc3339DayStart,
  rfc3339MonthEnd,
  rfc3339MonthStart,
} from '@/lib/calendar-format';
import { GOOGLE_CALENDAR_LIST_EVENTS } from '@/lib/graphql-modules';

export function CalendarApp() {
  const { openApp } = useOS();
  const {
    authed,
    accounts,
    googleUserId,
    setGoogleUserId,
    accessToken,
    tokenLoading,
    linkedLoading,
  } = useLinkedGoogleAccount();

  const [tab, setTab] = useState<CalendarShellTab>('Events');
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [todayFocus, setTodayFocus] = useState(() => new Date());

  const monthAnchor = useMemo(
    () => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1),
    [viewMonth]
  );
  const timeMinMonth = useMemo(() => rfc3339MonthStart(monthAnchor), [monthAnchor]);
  const timeMaxMonth = useMemo(() => rfc3339MonthEnd(monthAnchor), [monthAnchor]);

  const timeMinToday = useMemo(() => rfc3339DayStart(todayFocus), [todayFocus]);
  const timeMaxToday = useMemo(() => rfc3339DayEnd(todayFocus), [todayFocus]);

  const monthEventsSkip = !accessToken || (tab !== 'Events' && tab !== 'Planning');
  const todayEventsSkip = !accessToken || tab !== 'Today';

  const monthEventsQ = useQuery(GOOGLE_CALENDAR_LIST_EVENTS, {
    skip: monthEventsSkip,
    variables: {
      params: {
        access_token: accessToken,
        time_min: timeMinMonth,
        time_max: timeMaxMonth,
        max_results: 250,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const todayEventsQ = useQuery(GOOGLE_CALENDAR_LIST_EVENTS, {
    skip: todayEventsSkip,
    variables: {
      params: {
        access_token: accessToken,
        time_min: timeMinToday,
        time_max: timeMaxToday,
        max_results: 100,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const monthEvents = useMemo(() => {
    const p = coerceCalendarListPayload(monthEventsQ.data?.googleCalendarListEvents);
    return parseCalendarItems(p?.items ?? []);
  }, [monthEventsQ.data?.googleCalendarListEvents]);

  const todayEvents = useMemo(() => {
    const p = coerceCalendarListPayload(todayEventsQ.data?.googleCalendarListEvents);
    return parseCalendarItems(p?.items ?? []);
  }, [todayEventsQ.data?.googleCalendarListEvents]);

  const monthLabel = viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  if (!authed) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Sign in to the desktop to use Calendar.
      </div>
    );
  }

  if (linkedLoading && accounts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-sm text-white/50">
        Loading linked accounts…
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-sm text-white/60">
        <p>No Google account linked.</p>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/90 hover:bg-white/10"
          onClick={() => openApp('settings', { settingsTab: 'Accounts' })}
        >
          Open Settings → Accounts
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F9FAFB] text-slate-800">
      <CalendarHeader
        activeTab={tab}
        onTab={setTab}
        accounts={accounts}
        googleUserId={googleUserId}
        onGoogleUserId={setGoogleUserId}
        onOpenSettings={() => openApp('settings', { settingsTab: 'Accounts' })}
      />

      {!accessToken && tokenLoading ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
          Loading account token…
        </div>
      ) : !accessToken ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-amber-800">
          <p>No access token. Re-link your Google account in Settings.</p>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-slate-50"
            onClick={() => openApp('settings', { settingsTab: 'Accounts' })}
          >
            Open Settings → Accounts
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={tab}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="h-full min-h-0 overflow-y-auto p-6 sm:p-10"
            >
              {tab === 'Events' ? (
                <EventsTab
                  events={monthEvents}
                  loading={monthEventsQ.loading}
                  errorMessage={monthEventsQ.error?.message ?? null}
                  monthLabel={monthLabel}
                  onPrevMonth={() =>
                    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  onNextMonth={() =>
                    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                />
              ) : null}
              {tab === 'Today' ? (
                <TodayTab
                  focusDay={todayFocus}
                  onChangeFocusDay={setTodayFocus}
                  events={todayEvents}
                  loading={todayEventsQ.loading}
                  errorMessage={todayEventsQ.error?.message ?? null}
                />
              ) : null}
              {tab === 'Planning' ? (
                <PlanningTab
                  viewMonth={viewMonth}
                  monthLabel={monthLabel}
                  onPrevMonth={() =>
                    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  onNextMonth={() =>
                    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  events={monthEvents}
                  loading={monthEventsQ.loading}
                  errorMessage={monthEventsQ.error?.message ?? null}
                  onPickDay={(d) => {
                    setTodayFocus(d);
                    setViewMonth(d);
                    setTab('Today');
                  }}
                />
              ) : null}
              {tab === 'Contacts' ? (
                <ContactsTab active={tab === 'Contacts'} accessToken={accessToken} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
