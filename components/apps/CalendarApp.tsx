'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import { Presence } from '@/components/motion/PresenceList';
import { useMemo, useState } from 'react';

import { CalendarHeader, type CalendarShellTab } from '@/components/apps/calendar/CalendarHeader';
import { ContactsTab } from '@/components/apps/calendar/tabs/ContactsTab';
import { EventsTab } from '@/components/apps/calendar/tabs/EventsTab';
import { PlanningTab } from '@/components/apps/calendar/tabs/PlanningTab';
import { TodayTab } from '@/components/apps/calendar/tabs/TodayTab';
import { useOS } from '@/components/os-context';
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import { useCachedQuery } from '@/hooks/use-cached-query';
import {
  coerceCalendarListPayload,
  parseCalendarItems,
  rfc3339DayEnd,
  rfc3339DayStart,
  rfc3339MonthEnd,
  rfc3339MonthStart,
} from '@/lib/calendar-format';
import { calShell, calWarning } from '@/components/apps/calendar/calendar-theme';
import { CACHE_TTL_MS } from '@/lib/local-cache';
import { GOOGLE_CALENDAR_LIST_EVENTS, ME } from '@/lib/graphql-modules';

export function CalendarApp() {
  const { openApp } = useOS();
  const client = useApolloClient();
  const meQ = useQuery(ME);
  const meId = meQ.data?.me?.id ?? '';
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

  const monthCacheKey =
    !monthEventsSkip && accessToken && googleUserId && meId
      ? `calendar_events:${meId}:${googleUserId}:${timeMinMonth}:${timeMaxMonth}`
      : 'calendar_events:__month_idle__';

  const monthEventsCached = useCachedQuery<unknown>(
    monthCacheKey,
    async () => {
      if (!accessToken || !googleUserId || !meId) return null;
      const { data } = await client.query({
        query: GOOGLE_CALENDAR_LIST_EVENTS,
        variables: {
          params: {
            access_token: accessToken,
            time_min: timeMinMonth,
            time_max: timeMaxMonth,
            max_results: 250,
          },
        },
        fetchPolicy: 'network-only',
      });
      return data?.googleCalendarListEvents ?? null;
    },
    CACHE_TTL_MS.calendar_events,
    { backgroundRefreshMs: 45_000 }
  );

  const todayCacheKey =
    !todayEventsSkip && accessToken && googleUserId && meId
      ? `calendar_events:${meId}:${googleUserId}:today:${timeMinToday}:${timeMaxToday}`
      : 'calendar_events:__today_idle__';

  const todayEventsCached = useCachedQuery<unknown>(
    todayCacheKey,
    async () => {
      if (!accessToken || !googleUserId || !meId) return null;
      const { data } = await client.query({
        query: GOOGLE_CALENDAR_LIST_EVENTS,
        variables: {
          params: {
            access_token: accessToken,
            time_min: timeMinToday,
            time_max: timeMaxToday,
            max_results: 100,
          },
        },
        fetchPolicy: 'network-only',
      });
      return data?.googleCalendarListEvents ?? null;
    },
    CACHE_TTL_MS.calendar_events,
    { backgroundRefreshMs: 45_000 }
  );

  const monthEvents = useMemo(() => {
    const p = coerceCalendarListPayload(monthEventsCached.data);
    return parseCalendarItems(p?.items ?? []);
  }, [monthEventsCached.data]);

  const todayEvents = useMemo(() => {
    const p = coerceCalendarListPayload(todayEventsCached.data);
    return parseCalendarItems(p?.items ?? []);
  }, [todayEventsCached.data]);

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
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${calShell}`}>
      <CalendarHeader
        activeTab={tab}
        onTab={setTab}
        accounts={accounts}
        googleUserId={googleUserId}
        onGoogleUserId={setGoogleUserId}
        onOpenSettings={() => openApp('settings', { settingsTab: 'Accounts' })}
      />

      {!accessToken && tokenLoading ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/40">
          Loading account token…
        </div>
      ) : !accessToken ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm">
          <p className={calWarning}>No access token. Re-link your Google account in Settings.</p>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/90 hover:bg-white/10"
            onClick={() => openApp('settings', { settingsTab: 'Accounts' })}
          >
            Open Settings → Accounts
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Presence
            show
            presenceKey={tab}
            enterStyle={{ opacity: 0, x: 36 }}
            leaveStyle={{ opacity: 0, x: -36 }}
            targetStyle={{ opacity: 1, x: 0 }}
          >
            <div className="h-full min-h-0 overflow-y-auto p-6 sm:p-10">
              {tab === 'Events' ? (
                <EventsTab
                  events={monthEvents}
                  loading={monthEventsCached.loading}
                  errorMessage={monthEventsCached.error?.message ?? null}
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
                  loading={todayEventsCached.loading}
                  errorMessage={todayEventsCached.error?.message ?? null}
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
                  loading={monthEventsCached.loading}
                  errorMessage={monthEventsCached.error?.message ?? null}
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
            </div>
          </Presence>
        </div>
      )}
    </div>
  );
}
