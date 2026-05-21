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
      }));
  } else {
    items = migrateV1Layout(raw as LegacyWidgetLayoutItem[]);
    return clampLayoutZ(items);
  }

  return clampLayoutZ(migrateLegacyWeatherLayout(mergeLayoutWithRegistry(items)));
}
