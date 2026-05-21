'use client';

import { TransitionMotion, spring, type TransitionStyle } from 'react-motion';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { listItemSpring } from '@/lib/motion/spring-presets';

export type PresenceItem<T = unknown> = {
  key: string;
  data?: T;
};

type PlainStyle = Record<string, number>;

type PresenceListProps<T> = {
  items: PresenceItem<T>[];
  /** Target style per item when present. */
  getStyle: (item: PresenceItem<T>) => PlainStyle;
  /** Enter from (default: zeros). */
  getEnterStyle?: (item: PresenceItem<T>) => PlainStyle;
  /** Leave to (default: zeros); return null to remove immediately. */
  getLeaveStyle?: (item: PresenceItem<T>) => PlainStyle | null;
  className?: string;
  children: (item: PresenceItem<T>, style: CSSPropertiesLike) => ReactNode;
};

type CSSPropertiesLike = {
  opacity?: number;
  height?: number;
  maxHeight?: number;
  scale?: number;
  x?: number;
  y?: number;
};

function toCss(s: Record<string, number>): CSSPropertiesLike {
  return { ...s };
}

function styleToMotion(plain: PlainStyle, reduced: boolean): TransitionStyle['style'] {
  const out: TransitionStyle['style'] = {};
  for (const [k, v] of Object.entries(plain)) {
    out[k] = reduced ? v : spring(v, listItemSpring);
  }
  return out;
}

export function PresenceList<T>({
  items,
  getStyle,
  getEnterStyle,
  getLeaveStyle,
  className,
  children,
}: PresenceListProps<T>): ReactElement {
  const reduced = usePrefersReducedMotion();

  const styles: TransitionStyle[] = items.map((item) => ({
    key: item.key,
    data: item.data,
    style: styleToMotion(getStyle(item), reduced),
  }));

  return (
    <TransitionMotion
      styles={styles}
      willEnter={(styleThatEntered) => {
        const item = items.find((i) => i.key === styleThatEntered.key);
        if (!item) return {};
        const enter = getEnterStyle?.(item) ?? { opacity: 0, height: 0, maxHeight: 0 };
        const result: PlainStyle = {};
        for (const [k, v] of Object.entries(enter)) result[k] = v;
        return result;
      }}
      willLeave={(styleThatLeft) => {
        const item = items.find((i) => i.key === styleThatLeft.key);
        if (!item) return undefined;
        const leave = getLeaveStyle?.(item) ?? { opacity: 0, height: 0, maxHeight: 0 };
        if (leave === null) return undefined;
        return styleToMotion(leave, reduced);
      }}
    >
      {(interpolated) => (
        <div className={className}>
          {interpolated.map((config) => {
            const item = items.find((i) => i.key === config.key);
            if (!item) return null;
            const css = toCss(config.style as Record<string, number>);
            const style: CSSProperties = {
              opacity: css.opacity,
              transform:
                css.x != null || css.y != null
                  ? `translate3d(${css.x ?? 0}px, ${css.y ?? 0}px, 0)`
                  : css.scale != null
                    ? `scale(${css.scale})`
                    : undefined,
              height: css.height,
              maxHeight: css.maxHeight,
              overflow: css.maxHeight != null ? 'hidden' : undefined,
            };
            return (
              <div key={config.key} className="motion-gpu">
                {children(item, css)}
              </div>
            );
          })}
        </div>
      )}
    </TransitionMotion>
  );
}

/** Single child show/hide (AnimatePresence replacement). */
export function Presence({
  show,
  presenceKey,
  children,
  enterStyle = { opacity: 0, scale: 0.96 },
  leaveStyle = { opacity: 0, scale: 0.96 },
  targetStyle = { opacity: 1, scale: 1 },
}: {
  show: boolean;
  presenceKey: string;
  children: ReactNode;
  enterStyle?: PlainStyle;
  leaveStyle?: PlainStyle;
  targetStyle?: PlainStyle;
}): ReactElement | null {
  const items = show ? [{ key: presenceKey }] : [];
  return (
    <PresenceList
      items={items}
      getStyle={() => targetStyle}
      getEnterStyle={() => enterStyle}
      getLeaveStyle={() => leaveStyle}
    >
      {() => children}
    </PresenceList>
  );
}
