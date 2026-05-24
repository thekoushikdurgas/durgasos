import { clampWidgetZIndex } from '@/lib/shell-z-index';
import {
  createDefaultLayout,
  getWidgetDefinition,
  isKnownWidgetType,
  WIDGET_REGISTRY,
  type WidgetAnchor,
  type WidgetLayoutItem,
  type WidgetPosition,
  type WidgetType,
} from '@/lib/widget-registry';

function clampLayoutZ(items: WidgetLayoutItem[]): WidgetLayoutItem[] {
  return items.map((w) => ({ ...w, zIndex: clampWidgetZIndex(w.zIndex ?? 1) }));
}

const LEGACY_WEATHER_TYPE = 'weather';

/** Keep widgets below top bar and above dock (fractions of full canvas). */
export const WIDGET_MARGIN_TOP = 0.05;
export const WIDGET_MARGIN_BOTTOM = 0.14;
export const WIDGET_MARGIN_LEFT = 0.02;
export const WIDGET_MARGIN_RIGHT = 0.02;

/** @deprecated use WIDGET_MARGIN_* — same values, canvas-relative */
export const WIDGET_SAFE_TOP = WIDGET_MARGIN_TOP;
export const WIDGET_SAFE_BOTTOM = WIDGET_MARGIN_BOTTOM;
export const WIDGET_SAFE_LEFT = WIDGET_MARGIN_LEFT;
export const WIDGET_SAFE_RIGHT = WIDGET_MARGIN_RIGHT;

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function clampPosition(pos: WidgetPosition): WidgetPosition {
  return {
    x: clamp01(pos.x),
    y: clamp01(pos.y),
  };
}

/** Clamp normalized position on full canvas (matches left/top % application). */
export function clampPositionOnCanvas(pos: WidgetPosition): WidgetPosition {
  return {
    x: clamp01(Math.min(1 - WIDGET_MARGIN_RIGHT, Math.max(WIDGET_MARGIN_LEFT, pos.x))),
    y: clamp01(Math.min(1 - WIDGET_MARGIN_BOTTOM, Math.max(WIDGET_MARGIN_TOP, pos.y))),
  };
}

/** @deprecated alias */
export const clampPositionInSafeArea = clampPositionOnCanvas;

export function anchorTransform(anchor: WidgetAnchor): string {
  switch (anchor) {
    case 'top-center':
      return 'translate(-50%, 0)';
    case 'top-right':
      return 'translate(-100%, 0)';
    default:
      return 'translate(0, 0)';
  }
}

/** Map element rect to canvas-normalized anchor position (same space as left/top %). */
export function positionFromElementRect(
  anchor: WidgetAnchor,
  nRect: DOMRect,
  cRect: DOMRect
): WidgetPosition {
  let anchorX = nRect.left;
  if (anchor === 'top-center') anchorX = nRect.left + nRect.width / 2;
  else if (anchor === 'top-right') anchorX = nRect.right;

  const x = cRect.width > 0 ? (anchorX - cRect.left) / cRect.width : 0;
  const y = cRect.height > 0 ? (nRect.top - cRect.top) / cRect.height : 0;
  return clampPositionOnCanvas({ x, y });
}

/** Apply drag pixel offset to stored canvas position (WYSIWYG with motion drag). */
export function positionFromDragOffset(
  current: WidgetPosition,
  offsetX: number,
  offsetY: number,
  containerWidth: number,
  containerHeight: number
): WidgetPosition {
  if (containerWidth <= 0 || containerHeight <= 0) return current;
  return clampPositionOnCanvas({
    x: current.x + offsetX / containerWidth,
    y: current.y + offsetY / containerHeight,
  });
}

/**
 * Pick drop position that matches what the user saw while dragging.
 * top-left: motion offset matches stored anchor coords.
 * top-center / top-right: DOM anchor point after transform (offset math drifts).
 */
export function resolveDropPosition(
  anchor: WidgetAnchor,
  start: WidgetPosition,
  offsetX: number,
  offsetY: number,
  nRect: DOMRect,
  cRect: DOMRect
): WidgetPosition {
  const fromOffset = positionFromDragOffset(start, offsetX, offsetY, cRect.width, cRect.height);
  const fromRect = positionFromElementRect(anchor, nRect, cRect);
  if (anchor === 'top-left') return fromOffset;
  return fromRect;
}

export type LegacyWidgetLayoutItem = {
  id?: string;
  type?: string;
  enabled?: boolean;
  column?: number;
  position?: WidgetPosition;
  zIndex?: number;
};

export function isV2LayoutItem(item: unknown): item is WidgetLayoutItem {
  if (!item || typeof item !== 'object') return false;
  const row = item as LegacyWidgetLayoutItem;
  return (
    typeof row.id === 'string' &&
    typeof row.type === 'string' &&
    typeof row.enabled === 'boolean' &&
    row.position != null &&
    typeof row.position.x === 'number' &&
    typeof row.position.y === 'number'
  );
}

function applyLegacyWeatherSplit(
  byType: Map<WidgetType, WidgetLayoutItem>,
  legacy: LegacyWidgetLayoutItem
): void {
  const enabled = Boolean(legacy.enabled);
  const base = legacy.position ?? getWidgetDefinition('weather_current').defaultPosition;
  const z = legacy.zIndex ?? getWidgetDefinition('weather_current').defaultZIndex;

  const splits: { type: WidgetType; position: WidgetPosition; zIndex: number }[] = [
    {
      type: 'weather_hourly',
      position: { x: base.x - 0.14, y: base.y },
      zIndex: z - 1,
    },
    {
      type: 'weather_current',
      position: { ...base },
      zIndex: z,
    },
    {
      type: 'weather_daily',
      position: { x: base.x + 0.14, y: base.y },
      zIndex: z + 1,
    },
  ];

  for (const split of splits) {
    const existing = byType.get(split.type);
    byType.set(split.type, {
      id: existing?.id ?? `${split.type}-1`,
      type: split.type,
      enabled,
      position: clampPositionOnCanvas(split.position),
      zIndex: split.zIndex,
    });
  }
}

export function migrateLegacyWeatherLayout(items: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const legacy = items.find((w) => (w.type as string) === LEGACY_WEATHER_TYPE);
  if (!legacy) return items;

  const defaults = createDefaultLayout();
  const byType = new Map(defaults.map((d) => [d.type, { ...d }]));

  for (const row of items) {
    if ((row.type as string) === LEGACY_WEATHER_TYPE) continue;
    if (!isKnownWidgetType(row.type)) continue;
    byType.set(row.type, {
      ...row,
      position: clampPositionOnCanvas(row.position),
      zIndex: row.zIndex ?? getWidgetDefinition(row.type).defaultZIndex,
    });
  }

  applyLegacyWeatherSplit(byType, legacy);
  return WIDGET_REGISTRY.map((d) => byType.get(d.type)!);
}

function mergeLayoutWithRegistry(items: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const defaults = createDefaultLayout();
  const byType = new Map(defaults.map((d) => [d.type, { ...d }]));

  for (const row of items) {
    if (!isKnownWidgetType(row.type)) continue;
    byType.set(row.type, {
      ...row,
      position: clampPositionOnCanvas(row.position),
      zIndex: row.zIndex ?? getWidgetDefinition(row.type).defaultZIndex,
      screen: row.screen ?? getWidgetDefinition(row.type).defaultScreen ?? 0,
    });
  }

  return WIDGET_REGISTRY.map((d) => byType.get(d.type)!);
}

export function migrateV1Layout(raw: LegacyWidgetLayoutItem[]): WidgetLayoutItem[] {
  const defaults = createDefaultLayout();
  const byType = new Map(defaults.map((d) => [d.type, { ...d }]));
  let rightColumnIndex = 0;

  for (const row of raw) {
    const type = row.type ?? 'clock';
    if (type === LEGACY_WEATHER_TYPE) {
      applyLegacyWeatherSplit(byType, row);
      if (row.enabled && row.column === 2) {
        rightColumnIndex += 1;
      }
      continue;
    }
    if (!isKnownWidgetType(type)) continue;

    const def = getWidgetDefinition(type);
    const existing = byType.get(type);
    if (!existing) continue;

    let position = { ...def.defaultPosition };
    if (row.column === 2 && row.enabled) {
      position = {
        x: 0.72,
        y: clamp01(0.42 + rightColumnIndex * 0.14),
      };
      rightColumnIndex += 1;
    }

    byType.set(type, {
      id: row.id ?? existing.id,
      type,
      enabled: Boolean(row.enabled),
      position: clampPositionOnCanvas(position),
      zIndex: row.zIndex ?? def.defaultZIndex,
    });
  }

  return WIDGET_REGISTRY.map((d) => byType.get(d.type)!);
}

export function normalizeLayoutPayload(raw: unknown): WidgetLayoutItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return createDefaultLayout();

  let items: WidgetLayoutItem[];
  if (isV2LayoutItem(raw[0])) {
    items = raw
      .filter((row): row is WidgetLayoutItem => isV2LayoutItem(row))
      .filter((row) => isKnownWidgetType(row.type) || (row.type as string) === LEGACY_WEATHER_TYPE)
      .map((row) => ({
        ...row,
        position: clampPositionOnCanvas(row.position),
        zIndex:
          row.zIndex ??
          (isKnownWidgetType(row.type)
            ? getWidgetDefinition(row.type).defaultZIndex
            : getWidgetDefinition('weather_current').defaultZIndex),
        screen:
          row.screen ??
          (isKnownWidgetType(row.type) ? getWidgetDefinition(row.type).defaultScreen : 0) ??
          0,
      }));
  } else {
    items = migrateV1Layout(raw as LegacyWidgetLayoutItem[]);
    return clampLayoutZ(items);
  }

  return clampLayoutZ(migrateLegacyWeatherLayout(mergeLayoutWithRegistry(items)));
}

export const WIDGET_DEFAULT_SIZES: Record<WidgetType, { width: number; height: number }> = {
  ai_search: { width: 448, height: 80 },
  clock: { width: 200, height: 100 },
  weather_hourly: { width: 220, height: 180 },
  weather_current: { width: 180, height: 160 },
  weather_daily: { width: 200, height: 240 },
  agent_status: { width: 240, height: 200 },
  system_feed: { width: 240, height: 200 },
  system_health: { width: 280, height: 240 },
  live_feed: { width: 320, height: 280 },
  quick_actions: { width: 240, height: 80 },
  app_todo: { width: 256, height: 260 },
  app_chat: { width: 256, height: 260 },
  app_gmail: { width: 256, height: 260 },
  app_calendar: { width: 256, height: 260 },
};

export function snapToGrid(pos: WidgetPosition, cols = 12, rows = 8): WidgetPosition {
  const activeWidth = 1 - WIDGET_MARGIN_LEFT - WIDGET_MARGIN_RIGHT;
  const activeHeight = 1 - WIDGET_MARGIN_TOP - WIDGET_MARGIN_BOTTOM;

  const relativeX = pos.x - WIDGET_MARGIN_LEFT;
  const relativeY = pos.y - WIDGET_MARGIN_TOP;

  const stepX = activeWidth / cols;
  const stepY = activeHeight / rows;

  const colIndex = Math.round(relativeX / stepX);
  const rowIndex = Math.round(relativeY / stepY);

  const clampedCol = Math.max(0, Math.min(cols, colIndex));
  const clampedRow = Math.max(0, Math.min(rows, rowIndex));

  return {
    x: Number((WIDGET_MARGIN_LEFT + clampedCol * stepX).toFixed(6)),
    y: Number((WIDGET_MARGIN_TOP + clampedRow * stepY).toFixed(6)),
  };
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function rectsOverlap(r1: Rect, r2: Rect, margin = 4): boolean {
  return !(
    r1.right - margin <= r2.left + margin ||
    r1.left + margin >= r2.right - margin ||
    r1.bottom - margin <= r2.top + margin ||
    r1.top + margin >= r2.bottom - margin
  );
}

function measureWidgetSize(type: WidgetType, id: string): { width: number; height: number } {
  const fallback = WIDGET_DEFAULT_SIZES[type] || { width: 240, height: 200 };
  if (typeof document === 'undefined') return fallback;
  const el = document.querySelector(`[data-widget-id="${id}"]`) as HTMLElement | null;
  if (!el) return fallback;
  return { width: el.offsetWidth || fallback.width, height: el.offsetHeight || fallback.height };
}

function widgetBoundsRect(
  pos: WidgetPosition,
  type: WidgetType,
  id: string,
  canvasWidth: number,
  canvasHeight: number
): Rect {
  const anchor = getWidgetDefinition(type).anchor;
  const { width: wWidth, height: wHeight } = measureWidgetSize(type, id);
  let leftPx = pos.x * canvasWidth;
  if (anchor === 'top-center') leftPx -= wWidth / 2;
  else if (anchor === 'top-right') leftPx -= wWidth;
  const topPx = pos.y * canvasHeight;
  return { left: leftPx, top: topPx, right: leftPx + wWidth, bottom: topPx + wHeight };
}

function positionOverlapsOthers(
  pos: WidgetPosition,
  id: string,
  type: WidgetType,
  items: WidgetLayoutItem[],
  canvasWidth: number,
  canvasHeight: number,
  targetScreen = 0
): boolean {
  const rect = widgetBoundsRect(pos, type, id, canvasWidth, canvasHeight);
  const others = items.filter(
    (w) =>
      w.enabled &&
      w.id !== id &&
      w.position &&
      Number.isFinite(w.position.x) &&
      Number.isFinite(w.position.y) &&
      (w.screen ?? 0) === targetScreen
  );

  for (const other of others) {
    const otherRect = widgetBoundsRect(
      other.position,
      other.type,
      other.id,
      canvasWidth,
      canvasHeight
    );
    if (rectsOverlap(rect, otherRect)) return true;
  }
  return false;
}

export function findNearestNonOverlappingPos(
  id: string,
  targetType: WidgetType,
  targetPos: WidgetPosition,
  items: WidgetLayoutItem[],
  containerWidth: number,
  containerHeight: number,
  targetScreen = 0,
  cols = 12,
  rows = 8
): WidgetPosition {
  const width = containerWidth > 0 ? containerWidth : 1440;
  const height = containerHeight > 900 ? containerHeight : 900;

  const preferred = snapToGrid(clampPositionOnCanvas(targetPos));
  if (!positionOverlapsOthers(preferred, id, targetType, items, width, height, targetScreen)) {
    return preferred;
  }

  const activeWidth = 1 - WIDGET_MARGIN_LEFT - WIDGET_MARGIN_RIGHT;
  const activeHeight = 1 - WIDGET_MARGIN_TOP - WIDGET_MARGIN_BOTTOM;
  const stepX = activeWidth / cols;
  const stepY = activeHeight / rows;

  const targetCol = Math.round((preferred.x - WIDGET_MARGIN_LEFT) / stepX);
  const targetRow = Math.round((preferred.y - WIDGET_MARGIN_TOP) / stepY);

  const candidates: { c: number; r: number; dist: number }[] = [];
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) {
      const dist = Math.hypot(c - targetCol, r - targetRow);
      candidates.push({ c, r, dist });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);

  for (const cand of candidates) {
    const candX = WIDGET_MARGIN_LEFT + cand.c * stepX;
    const candY = WIDGET_MARGIN_TOP + cand.r * stepY;
    const candidate = {
      x: Number(candX.toFixed(6)),
      y: Number(candY.toFixed(6)),
    };
    if (!positionOverlapsOthers(candidate, id, targetType, items, width, height, targetScreen)) {
      return candidate;
    }
  }

  return preferred;
}
