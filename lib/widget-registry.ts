import type { LucideIcon } from 'lucide-react';
import { Bot, CalendarDays, Clock, CloudSun, LayoutGrid, MessageSquare, Rss } from 'lucide-react';

export type WidgetType =
  | 'clock'
  | 'weather_hourly'
  | 'weather_current'
  | 'weather_daily'
  | 'ai_search'
  | 'agent_status'
  | 'system_feed'
  | 'quick_actions';

export type WidgetAnchor = 'top-left' | 'top-center' | 'top-right';

export type WidgetPosition = { x: number; y: number };

export type WidgetLayoutItem = {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position: WidgetPosition;
  zIndex?: number;
};

export type WidgetDefinition = {
  type: WidgetType;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultEnabled: boolean;
  defaultPosition: WidgetPosition;
  anchor: WidgetAnchor;
  defaultZIndex: number;
};

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'ai_search',
    label: 'AI Assistant',
    description: 'Ask DurgasOS anything from the desktop.',
    icon: MessageSquare,
    defaultEnabled: true,
    defaultPosition: { x: 0.5, y: 0.06 },
    anchor: 'top-center',
    defaultZIndex: 52,
  },
  {
    type: 'clock',
    label: 'Clock',
    description: 'Large digital time on your desktop.',
    icon: Clock,
    defaultEnabled: true,
    defaultPosition: { x: 0.88, y: 0.42 },
    anchor: 'top-right',
    defaultZIndex: 2,
  },
  {
    type: 'weather_hourly',
    label: 'Hourly forecast',
    description: 'Scrollable hour-by-hour temperature and conditions.',
    icon: Clock,
    defaultEnabled: true,
    defaultPosition: { x: 0.58, y: 0.52 },
    anchor: 'top-left',
    defaultZIndex: 3,
  },
  {
    type: 'weather_current',
    label: 'Current weather',
    description: 'Current temperature, summary, and location.',
    icon: CloudSun,
    defaultEnabled: true,
    defaultPosition: { x: 0.72, y: 0.52 },
    anchor: 'top-left',
    defaultZIndex: 4,
  },
  {
    type: 'weather_daily',
    label: 'Daily outlook',
    description: 'Five-day forecast with highs and lows.',
    icon: CalendarDays,
    defaultEnabled: true,
    defaultPosition: { x: 0.86, y: 0.52 },
    anchor: 'top-left',
    defaultZIndex: 5,
  },
  {
    type: 'agent_status',
    label: 'Agent status',
    description: 'Workflow and agent activity feed.',
    icon: Bot,
    defaultEnabled: false,
    defaultPosition: { x: 0.75, y: 0.32 },
    anchor: 'top-left',
    defaultZIndex: 6,
  },
  {
    type: 'system_feed',
    label: 'System feed',
    description: 'Desktop event timeline from OS services.',
    icon: Rss,
    defaultEnabled: false,
    defaultPosition: { x: 0.75, y: 0.38 },
    anchor: 'top-left',
    defaultZIndex: 7,
  },
  {
    type: 'quick_actions',
    label: 'Quick actions',
    description: 'Launcher and workflow shortcuts.',
    icon: LayoutGrid,
    defaultEnabled: false,
    defaultPosition: { x: 0.78, y: 0.44 },
    anchor: 'top-left',
    defaultZIndex: 8,
  },
];

const REGISTRY_BY_TYPE = new Map(WIDGET_REGISTRY.map((d) => [d.type, d]));

export function isKnownWidgetType(type: string): type is WidgetType {
  return REGISTRY_BY_TYPE.has(type as WidgetType);
}

export function getWidgetDefinition(type: WidgetType): WidgetDefinition {
  return REGISTRY_BY_TYPE.get(type)!;
}

let idCounter = 0;

export function nextWidgetId(type: WidgetType): string {
  idCounter += 1;
  return `${type}-${Date.now()}-${idCounter}`;
}

export function createDefaultLayout(): WidgetLayoutItem[] {
  return WIDGET_REGISTRY.map((d) => ({
    id: `${d.type}-1`,
    type: d.type,
    enabled: d.defaultEnabled,
    position: { ...d.defaultPosition },
    zIndex: d.defaultZIndex,
  }));
}
