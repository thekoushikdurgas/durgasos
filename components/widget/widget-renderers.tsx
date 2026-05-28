'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Calendar as CalendarIcon, Mail } from 'lucide-react';

import { AgentsWidget } from '@/components/widget/AgentsWidget';
import { AiSearchWidget } from '@/components/widget/AiSearchWidget';
import { ChatHistoryWidget } from '@/components/widget/ChatHistoryWidget';
import { ClockWidget } from '@/components/widget/ClockWidget';
import { LiveFeedWidget } from '@/components/widget/LiveFeedWidget';
import { QuickActionsWidget } from '@/components/widget/QuickActionsWidget';
import { ServiceHealthWidget } from '@/components/widget/ServiceHealthWidget';
import { SystemFeedWidget } from '@/components/widget/SystemFeedWidget';
import { TodoWidget } from '@/components/widget/TodoWidget';
import { WeatherCurrentWidget } from '@/components/widget/weather/WeatherCurrentWidget';
import { WeatherDailyWidget } from '@/components/widget/weather/WeatherDailyWidget';
import { WeatherHourlyWidget } from '@/components/widget/weather/WeatherHourlyWidget';
import { WidgetShell } from '@/components/widgets/WidgetShell';
import { useOS } from '@/components/os-context';
import type { WidgetLayoutItem } from '@/lib/widget-registry';

// Extra Hooks & Data bindings
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import {
  GMAIL_LIST_THREADS,
  GOOGLE_CALENDAR_LIST_EVENTS,
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
} from '@/lib/graphql-modules';
import { LOCAL_GOOGLE_USER_ID } from '@/lib/todo-format';
import {
  rfc3339DayStart,
  rfc3339DayEnd,
  coerceCalendarListPayload,
  parseCalendarItems,
} from '@/lib/calendar-format';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';

type RendererProps = {
  item: WidgetLayoutItem;
  onRemove: () => void;
  onConfigure?: () => void;
};

function GmailWidgetContent() {
  const { openApp } = useOS();
  const { authed, accessToken, accounts } = useLinkedGoogleAccount();

  const { data, loading, error } = useQuery(GMAIL_LIST_THREADS, {
    variables: {
      params: {
        access_token: accessToken,
        max_results: 5,
      },
    },
    skip: !accessToken,
    pollInterval: 60000,
  });

  if (!authed || accounts.length === 0 || !accessToken) {
    return (
      <div className="w-64 flex flex-col items-center justify-center text-center p-3 gap-2">
        <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/40">
          <Mail className="h-4 w-4" />
        </div>
        <div className="text-xs font-semibold text-white/80">Gmail Unlinked</div>
        <div className="text-[10px] text-white/45 max-w-[200px]">
          Link Google account in Settings to view emails.
        </div>
        <button
          type="button"
          className="mt-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[10px] text-white/80 transition"
          onClick={() => openApp('settings', { settingsTab: 'Accounts' })}
        >
          Link Account
        </button>
      </div>
    );
  }

  const gmailData = data?.gmailListThreads as { threads?: any[] } | undefined;
  const threads = gmailData?.threads || [];

  return (
    <div className="w-64 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => openApp('gmail')}
          className="text-xs font-semibold text-white/80 hover:text-white transition flex items-center gap-1.5"
        >
          <Mail className="h-3.5 w-3.5 text-sky-400" />
          <span>Gmail Inbox</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
        {loading && threads.length === 0 ? (
          <div className="text-[10px] text-white/45 py-4 text-center">Loading inbox...</div>
        ) : error ? (
          <div className="text-[10px] text-red-300/80 py-4 text-center">Failed to load emails.</div>
        ) : threads.length === 0 ? (
          <div className="text-[10px] text-white/45 py-4 text-center">No unread messages.</div>
        ) : (
          threads.slice(0, 5).map((t: any) => (
            <button
              key={t.id}
              type="button"
              className="text-left p-2 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/5 hover:border-white/10 transition"
              onClick={() => openApp('gmail', { gmailThreadId: t.id })}
            >
              <div className="text-[10px] text-white/70 font-medium line-clamp-2 leading-relaxed">
                {t.snippet || '(No preview available)'}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CalendarWidgetContent() {
  const { openApp } = useOS();
  const { authed, accessToken, accounts } = useLinkedGoogleAccount();

  const timeMin = useMemo(() => rfc3339DayStart(new Date()), []);
  const timeMax = useMemo(() => rfc3339DayEnd(new Date()), []);

  const { data, loading, error } = useQuery(GOOGLE_CALENDAR_LIST_EVENTS, {
    variables: {
      params: {
        access_token: accessToken,
        time_min: timeMin,
        time_max: timeMax,
        max_results: 5,
      },
    },
    skip: !accessToken,
    pollInterval: 60000,
  });

  const events = useMemo(() => {
    const payload = coerceCalendarListPayload(data?.googleCalendarListEvents);
    return parseCalendarItems(payload?.items ?? []);
  }, [data]);

  if (!authed || accounts.length === 0 || !accessToken) {
    return (
      <div className="w-64 flex flex-col items-center justify-center text-center p-3 gap-2">
        <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/40">
          <CalendarIcon className="h-4 w-4" />
        </div>
        <div className="text-xs font-semibold text-white/80">Calendar Unlinked</div>
        <div className="text-[10px] text-white/45 max-w-[200px]">
          Link Google account in Settings to view events.
        </div>
        <button
          type="button"
          className="mt-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[10px] text-white/80 transition"
          onClick={() => openApp('settings', { settingsTab: 'Accounts' })}
        >
          Link Account
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => openApp('calendar')}
          className="text-xs font-semibold text-white/80 hover:text-white transition flex items-center gap-1.5"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-amber-400" />
          <span>{"Today's Events"}</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
        {loading && events.length === 0 ? (
          <div className="text-[10px] text-white/45 py-4 text-center">Loading events...</div>
        ) : error ? (
          <div className="text-[10px] text-red-300/80 py-4 text-center">Failed to load events.</div>
        ) : events.length === 0 ? (
          <div className="text-[10px] text-white/45 py-4 text-center">No events for today.</div>
        ) : (
          events.slice(0, 5).map((ev) => (
            <button
              key={ev.id}
              type="button"
              className="text-left p-2 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/5 hover:border-white/10 transition flex flex-col gap-0.5 hover:bg-white/5"
              onClick={() => openApp('calendar')}
            >
              <div className="text-[11px] text-white/85 font-semibold line-clamp-1">{ev.title}</div>
              <div className="text-[9px] text-white/45">{ev.timeLabel}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function WidgetRenderer({ item, onRemove, onConfigure }: RendererProps) {
  switch (item.type) {
    case 'clock':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <ClockWidget />
        </WidgetShell>
      );
    case 'weather_hourly':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <WeatherHourlyWidget />
        </WidgetShell>
      );
    case 'weather_current':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <WeatherCurrentWidget />
        </WidgetShell>
      );
    case 'weather_daily':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <WeatherDailyWidget />
        </WidgetShell>
      );
    case 'ai_search':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <AiSearchWidget />
        </WidgetShell>
      );
    case 'agent_status':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <AgentsWidget />
        </WidgetShell>
      );
    case 'system_feed':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <SystemFeedWidget />
        </WidgetShell>
      );
    case 'live_feed':
      return (
        <WidgetShell onRemove={onRemove}>
          <LiveFeedWidget />
        </WidgetShell>
      );
    case 'system_health':
      return (
        <WidgetShell onRemove={onRemove}>
          <ServiceHealthWidget />
        </WidgetShell>
      );
    case 'quick_actions':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <QuickActionsWidget />
        </WidgetShell>
      );
    case 'app_todo':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <TodoWidget />
        </WidgetShell>
      );
    case 'app_gmail':
      return (
        <WidgetShell onRemove={onRemove}>
          <GmailWidgetContent />
        </WidgetShell>
      );
    case 'app_calendar':
      return (
        <WidgetShell onRemove={onRemove}>
          <CalendarWidgetContent />
        </WidgetShell>
      );
    case 'app_chat':
      return (
        <WidgetShell variant="bare" onRemove={onRemove} onConfigure={onConfigure}>
          <ChatHistoryWidget />
        </WidgetShell>
      );
    default:
      return null;
  }
}
