'use client';

import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@apollo/client/react';
import { Calendar as CalendarIcon, Check, ListTodo, Mail, Plus, MessageSquare } from 'lucide-react';

import { AiSearchWidget } from '@/components/widget/AiSearchWidget';
import { LiveFeedWidget } from '@/components/widget/LiveFeedWidget';
import { ServiceHealthWidget } from '@/components/widget/ServiceHealthWidget';
import { WeatherCurrentWidget } from '@/components/widget/weather/WeatherCurrentWidget';
import { WeatherDailyWidget } from '@/components/widget/weather/WeatherDailyWidget';
import { WeatherHourlyWidget } from '@/components/widget/weather/WeatherHourlyWidget';
import { WidgetShell } from '@/components/widgets/WidgetShell';
import { useOS } from '@/components/os-context';
import type { WidgetLayoutItem } from '@/lib/widget-registry';
import { cn } from '@/lib/utils';

// Extra Hooks & Data bindings
import { useLinkedGoogleAccount } from '@/hooks/use-linked-google-account';
import { useTodoWorkspaces } from '@/hooks/use-todo-workspaces';
import { useTodoBoard } from '@/hooks/use-todo-board';
import { useTodoLocalBoard } from '@/hooks/use-todo-local-board';
import {
  GMAIL_LIST_THREADS,
  GOOGLE_CALENDAR_LIST_EVENTS,
  CHAT_CONVERSATIONS,
  GET_LINKED_GOOGLE_ACCOUNT_TOKEN,
} from '@/lib/graphql-modules';
import { LOCAL_GOOGLE_USER_ID, readTodoAccountPicker } from '@/lib/todo-format';
import {
  rfc3339DayStart,
  rfc3339DayEnd,
  coerceCalendarListPayload,
  parseCalendarItems,
} from '@/lib/calendar-format';
import { getThreadTitle } from '@/lib/chat-thread-titles';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';

type RendererProps = {
  item: WidgetLayoutItem;
  onRemove: () => void;
  onConfigure?: () => void;
};

function subscribeHydration(onStoreChange: () => void): () => void {
  queueMicrotask(onStoreChange);
  return () => {};
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false
  );
}

function ClockWidgetContent() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-5xl font-thin leading-none tracking-tight text-white/90 drop-shadow-md sm:text-[80px]">
        {time
          ? time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '00:00'}
      </div>
    </div>
  );
}

function QuickActionsWidgetContent() {
  const { toggleLauncher, openApp } = useOS();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className={cn(
          'rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
          'hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40'
        )}
        onClick={toggleLauncher}
      >
        Launcher
      </button>
      <button
        type="button"
        className={cn(
          'rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90',
          'hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40'
        )}
        onClick={() => openApp('workflow')}
      >
        Workflows
      </button>
    </div>
  );
}

function TodoWidgetContent() {
  const { openApp } = useOS();
  const { authed, accounts } = useLinkedGoogleAccount();

  const defaultTodoAccountId = useMemo(() => {
    if (!authed) return null;
    const ids = new Set([LOCAL_GOOGLE_USER_ID, ...accounts.map((a) => a.googleUserId)]);
    const stored = readTodoAccountPicker();
    if (stored && ids.has(stored)) return stored;
    return LOCAL_GOOGLE_USER_ID;
  }, [authed, accounts]);

  const todoAccountId = defaultTodoAccountId;
  const isLocalMode = todoAccountId === LOCAL_GOOGLE_USER_ID;

  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || isLocalMode || !todoAccountId,
    variables: { googleUserId: todoAccountId ?? '' },
  });

  const tokenPayload = useMemo(
    () => readGoogleTokenPayload(tokenQ.data?.getLinkedGoogleAccountToken),
    [tokenQ.data?.getLinkedGoogleAccountToken]
  );

  const accessTokenForTodo = tokenPayload.accessToken;

  const ws = useTodoWorkspaces(todoAccountId, accessTokenForTodo);
  const googleBoard = useTodoBoard(
    isLocalMode ? null : accessTokenForTodo,
    isLocalMode ? null : ws.activeWorkspaceId
  );
  const localBoard = useTodoLocalBoard(isLocalMode ? ws.activeWorkspaceId : null);

  const board = isLocalMode ? localBoard : googleBoard;

  const activeCards = useMemo(() => {
    return board.cards.filter((c) => c.column !== 'done').slice(0, 5);
  }, [board.cards]);

  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await board.onAddCard('todo', newTitle.trim());
    setNewTitle('');
  };

  return (
    <div className="w-64 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => openApp('todo')}
          className="text-xs font-semibold text-white/80 hover:text-white transition flex items-center gap-1.5"
        >
          <ListTodo className="h-3.5 w-3.5 text-violet-400" />
          <span>Todo Tasks</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
        {board.busy && activeCards.length === 0 ? (
          <div className="text-[10px] text-white/45 py-2 text-center">Syncing...</div>
        ) : activeCards.length === 0 ? (
          <div className="text-[10px] text-white/45 py-2 text-center">No active tasks.</div>
        ) : (
          activeCards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  className="h-3.5 w-3.5 shrink-0 rounded border border-white/20 hover:border-violet-400 flex items-center justify-center text-transparent hover:text-violet-400 transition"
                  onClick={() => board.onDeleteCard(card)}
                >
                  <Check className="h-2.5 w-2.5" />
                </button>
                <span className="text-[11px] text-white/80 truncate">{card.title}</span>
              </div>
              <span className="text-[8px] uppercase tracking-wider text-white/35 px-1 py-0.2 rounded bg-white/5 font-semibold shrink-0">
                {card.column}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-1.5 mt-2 border-t border-white/5 pt-2">
        <input
          type="text"
          placeholder="Add task to todo list..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
        />
        <button
          type="submit"
          className="rounded bg-violet-600/80 hover:bg-violet-600 px-2.5 py-1 text-[10px] font-medium text-white transition flex items-center justify-center"
        >
          <Plus className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}

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

function ChatHistoryWidgetContent() {
  const { openApp } = useOS();
  const hydrated = useHydrated();

  const { data, loading, error } = useQuery(CHAT_CONVERSATIONS, {
    skip: !hydrated,
    variables: { limit: 5 },
    pollInterval: 30000,
  });

  const conversations = useMemo(() => {
    const inner = data?.chatConversations as { conversations?: unknown } | undefined;
    if (!inner) return [];
    const list = inner.conversations;
    return Array.isArray(list) ? list.slice(0, 5) : [];
  }, [data]);

  return (
    <div className="w-64 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => openApp('chat')}
          className="text-xs font-semibold text-white/80 hover:text-white transition flex items-center gap-1.5"
        >
          <MessageSquare className="h-3.5 w-3.5 text-teal-400" />
          <span>AI Chat History</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
        {(!hydrated || loading) && conversations.length === 0 ? (
          <div className="text-[10px] text-white/45 py-4 text-center">Loading chats...</div>
        ) : error ? (
          <div className="text-[10px] text-red-300/80 py-4 text-center">Failed to load chats.</div>
        ) : conversations.length === 0 ? (
          <div className="text-[10px] text-white/45 py-4 text-center">No recent chats.</div>
        ) : (
          conversations.map((c: any) => {
            const displayTitle = getThreadTitle(c.id) || `Chat ${c.id.slice(0, 8)}`;
            return (
              <button
                key={c.id}
                type="button"
                className="text-left p-2 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/5 hover:border-white/10 transition flex items-center justify-between"
                onClick={() => openApp('chat', { chatThreadId: c.id })}
              >
                <div className="text-[10px] text-white/80 truncate max-w-[170px]">
                  {displayTitle}
                </div>
                <div className="text-[8px] text-white/35 font-mono shrink-0 ml-2 bg-white/5 px-1 py-0.5 rounded">
                  {c.message_count ?? 0}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function WidgetRenderer({ item, onRemove, onConfigure }: RendererProps) {
  switch (item.type) {
    case 'clock':
      return (
        <WidgetShell onRemove={onRemove} onConfigure={onConfigure}>
          <ClockWidgetContent />
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
        <WidgetShell onRemove={onRemove}>
          <AiSearchWidget />
        </WidgetShell>
      );
    case 'agent_status':
      return (
        <WidgetShell title="Agents" onRemove={onRemove}>
          <p className="max-w-xs text-right text-xs text-white/55">
            Agent status feed will connect to workflow events when enabled on the backend.
          </p>
        </WidgetShell>
      );
    case 'system_feed':
      return (
        <WidgetShell title="System feed" onRemove={onRemove}>
          <p className="max-w-xs text-right text-xs text-white/55">
            Desktop event timeline — wire to system.feed WebSocket when available.
          </p>
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
        <WidgetShell title="Quick actions" onRemove={onRemove}>
          <QuickActionsWidgetContent />
        </WidgetShell>
      );
    case 'app_todo':
      return (
        <WidgetShell onRemove={onRemove}>
          <TodoWidgetContent />
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
        <WidgetShell onRemove={onRemove}>
          <ChatHistoryWidgetContent />
        </WidgetShell>
      );
    default:
      return null;
  }
}
