/// <reference types="vitest/globals" />
import {
  snapToGrid,
  rectsOverlap,
  findNearestNonOverlappingPos,
  type Rect,
} from './widget-layout-utils';
import type { WidgetLayoutItem } from './widget-registry';

describe('Widget Snap & Overlap math', () => {
  it('should snap coordinates to grid properly', () => {
    // Left margin is 0.02, right margin is 0.02, top margin is 0.05, bottom margin is 0.14
    // colWidth is 0.96 / 12 = 0.08
    // rowHeight is 0.81 / 8 = 0.10125

    // Test center snap
    const pos = { x: 0.5, y: 0.4 };
    const snapped = snapToGrid(pos);

    // x: 0.02 + col * 0.08. For x=0.5: (0.5 - 0.02) / 0.08 = 0.48 / 0.08 = 6. Exact match!
    // y: 0.05 + row * 0.10125. For y=0.4: (0.4 - 0.05) / 0.10125 = 0.35 / 0.10125 = 3.45 -> rowIndex=3
    // snapped y is 0.05 + 3 * 0.10125 = 0.35375
    expect(snapped.x).toBeCloseTo(0.5);
    expect(snapped.y).toBeCloseTo(0.35375);
  });

  it('should check rectangle overlap correctly', () => {
    const r1: Rect = { left: 10, top: 10, right: 100, bottom: 100 };
    const r2: Rect = { left: 90, top: 90, right: 200, bottom: 200 };
    const r3: Rect = { left: 110, top: 110, right: 200, bottom: 200 };

    // r1 and r2 overlap (r1 goes up to 100, r2 starts at 90. Overlap of 10px > 4px margin)
    expect(rectsOverlap(r1, r2)).toBe(true);

    // r1 and r3 do not overlap (r1 ends at 100, r3 starts at 110)
    expect(rectsOverlap(r1, r3)).toBe(false);
  });

  it('should find non-overlapping coordinates near target with all default widgets enabled', () => {
    // Default positions:
    // ai_search: { x: 0.5, y: 0.06 }
    // clock: { x: 0.88, y: 0.42 }
    // weather_hourly: { x: 0.58, y: 0.52 }
    // weather_current: { x: 0.72, y: 0.52 }
    // weather_daily: { x: 0.86, y: 0.52 }
    // app_todo: { x: 0.02, y: 0.06 }
    // app_chat: { x: 0.02, y: 0.42 }
    const items: WidgetLayoutItem[] = [
      { id: 'ai_search-1', type: 'ai_search', enabled: true, position: { x: 0.5, y: 0.06 } },
      { id: 'clock-1', type: 'clock', enabled: true, position: { x: 0.88, y: 0.42 } },
      {
        id: 'weather_hourly-1',
        type: 'weather_hourly',
        enabled: true,
        position: { x: 0.58, y: 0.52 },
      },
      {
        id: 'weather_current-1',
        type: 'weather_current',
        enabled: true,
        position: { x: 0.72, y: 0.52 },
      },
      {
        id: 'weather_daily-1',
        type: 'weather_daily',
        enabled: true,
        position: { x: 0.86, y: 0.52 },
      },
      { id: 'app_todo-1', type: 'app_todo', enabled: true, position: { x: 0.02, y: 0.06 } },
      { id: 'app_chat-1', type: 'app_chat', enabled: true, position: { x: 0.02, y: 0.42 } },
    ];

    const containerWidth = 1440;
    const containerHeight = 900;

    // Try to move clock-1 to an empty area like x: 0.34, y: 0.35 (col=4, row=3)
    const targetPos = snapToGrid({ x: 0.34, y: 0.35 });

    console.log('[WIDGET TEST] Proposing target position:', targetPos);

    const resolved = findNearestNonOverlappingPos(
      'clock-1',
      'clock',
      targetPos,
      items,
      containerWidth,
      containerHeight
    );

    console.log('[WIDGET TEST] Resolved position:', resolved);

    // It should successfully resolve to a position
    expect(resolved).not.toBeNull();
  });
});
