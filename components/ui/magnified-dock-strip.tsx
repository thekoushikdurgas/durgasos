'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type MagnifiedDockItem = {
  id: string;
  label: string;
  onClick: () => void;
  node: React.ReactNode;
  indicator?: boolean;
  active?: boolean;
};

export type MagnifiedDockStripProps = {
  items: MagnifiedDockItem[];
  className?: string;
  /** Accessible name for the magnified icon region (e.g. "Pinned and open applications") */
  stripAriaLabel?: string;
};

type DockConfig = {
  baseIconSize: number;
  maxScale: number;
  effectWidth: number;
};

/** Must match server render and first client paint to avoid dock hydration mismatches. */
const SSR_DOCK_CONFIG: DockConfig = {
  baseIconSize: 56,
  maxScale: 1.6,
  effectWidth: 240,
};

function getResponsiveConfig(): DockConfig {
  if (typeof window === 'undefined') {
    return SSR_DOCK_CONFIG;
  }

  const smallerDimension = Math.min(window.innerWidth, window.innerHeight);

  if (smallerDimension < 480) {
    return {
      baseIconSize: Math.max(40, smallerDimension * 0.08),
      maxScale: 1.35,
      effectWidth: smallerDimension * 0.4,
    };
  }
  if (smallerDimension < 768) {
    return {
      baseIconSize: Math.max(48, smallerDimension * 0.07),
      maxScale: 1.45,
      effectWidth: smallerDimension * 0.35,
    };
  }
  if (smallerDimension < 1024) {
    return {
      baseIconSize: Math.max(52, smallerDimension * 0.06),
      maxScale: 1.55,
      effectWidth: smallerDimension * 0.3,
    };
  }
  return {
    baseIconSize: Math.max(56, Math.min(72, smallerDimension * 0.05)),
    maxScale: 1.65,
    effectWidth: 280,
  };
}

function calculateTargetMagnification(
  mousePosition: number | null,
  itemCount: number,
  baseIconSize: number,
  baseSpacing: number,
  effectWidth: number,
  maxScale: number,
  minScale: number,
  reducedMotion: boolean
): number[] {
  if (reducedMotion || itemCount === 0) {
    return Array.from({ length: itemCount }, () => minScale);
  }
  if (mousePosition === null) {
    return Array.from({ length: itemCount }, () => minScale);
  }

  return Array.from({ length: itemCount }, (_, index) => {
    const normalIconCenter = index * (baseIconSize + baseSpacing) + baseIconSize / 2;
    const minX = mousePosition - effectWidth / 2;
    const maxX = mousePosition + effectWidth / 2;

    if (normalIconCenter < minX || normalIconCenter > maxX) {
      return minScale;
    }

    const theta = ((normalIconCenter - minX) / effectWidth) * 2 * Math.PI;
    const cappedTheta = Math.min(Math.max(theta, 0), 2 * Math.PI);
    const scaleFactor = (1 - Math.cos(cappedTheta)) / 2;

    return minScale + scaleFactor * (maxScale - minScale);
  });
}

function calculatePositions(scales: number[], baseIconSize: number, baseSpacing: number): number[] {
  let currentX = 0;
  return scales.map((scale) => {
    const scaledWidth = baseIconSize * scale;
    const centerX = currentX + scaledWidth / 2;
    currentX += scaledWidth + baseSpacing;
    return centerX;
  });
}

function contentWidthFromLayout(
  positions: number[],
  scales: number[],
  baseIconSize: number
): number {
  if (positions.length === 0) return 0;
  let maxRight = 0;
  for (let i = 0; i < positions.length; i++) {
    const half = (baseIconSize * scales[i]) / 2;
    maxRight = Math.max(maxRight, positions[i] + half);
  }
  return maxRight;
}

function isNearlySettled(
  scales: number[],
  targetScales: number[],
  positions: number[],
  targetPositions: number[]
): boolean {
  const epsS = 0.004;
  const epsP = 0.15;
  for (let i = 0; i < scales.length; i++) {
    if (Math.abs(scales[i] - targetScales[i]) > epsS) return false;
    if (Math.abs(positions[i] - targetPositions[i]) > epsP) return false;
  }
  return true;
}

type Layout = {
  scales: number[];
  positions: number[];
};

function createUniformLayout(n: number, baseIconSize: number, baseSpacing: number): Layout {
  if (n === 0) return { scales: [], positions: [] };
  const ones = Array.from({ length: n }, () => 1);
  return { scales: ones, positions: calculatePositions(ones, baseIconSize, baseSpacing) };
}

type AnimSnapshot = {
  mouseX: number | null;
  itemCount: number;
  reducedMotion: boolean;
  baseIconSize: number;
  maxScale: number;
  effectWidth: number;
  baseSpacing: number;
};

export function MagnifiedDockStrip({
  items,
  className,
  stripAriaLabel = 'Dock applications',
}: MagnifiedDockStripProps) {
  const [config, setConfig] = React.useState<DockConfig>(() => SSR_DOCK_CONFIG);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [bounceId, setBounceId] = React.useState<string | null>(null);

  const { baseIconSize, maxScale, effectWidth } = config;
  const minScale = 1;
  const baseSpacing = Math.max(4, baseIconSize * 0.08);

  const itemCount = items.length;

  const [layout, setLayout] = React.useState<Layout>(() =>
    createUniformLayout(itemCount, baseIconSize, baseSpacing)
  );

  const layoutRef = React.useRef(layout);
  const animRef = React.useRef<AnimSnapshot>({
    mouseX: null,
    itemCount,
    reducedMotion,
    baseIconSize,
    maxScale,
    effectWidth,
    baseSpacing,
  });

  const mouseXRef = React.useRef<number | null>(null);
  const rafRef = React.useRef(0);
  const runningRef = React.useRef(false);
  const lastMoveTsRef = React.useRef(0);
  const bounceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useLayoutEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  React.useLayoutEffect(() => {
    animRef.current = {
      mouseX: mouseXRef.current,
      itemCount,
      reducedMotion,
      baseIconSize,
      maxScale,
      effectWidth,
      baseSpacing,
    };
  }, [itemCount, reducedMotion, baseIconSize, maxScale, effectWidth, baseSpacing]);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) setConfig(getResponsiveConfig());
    });
    const onResize = () => setConfig(getResponsiveConfig());
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const stopLoop = React.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    runningRef.current = false;
  }, []);

  const tickRef = React.useRef<() => void>(() => {});

  const tick = React.useCallback(() => {
    const a = animRef.current;
    const n = a.itemCount;
    const min = 1;

    if (n === 0) {
      runningRef.current = false;
      return;
    }

    let prev = layoutRef.current;
    if (prev.scales.length !== n) {
      const fresh = createUniformLayout(n, a.baseIconSize, a.baseSpacing);
      layoutRef.current = fresh;
      prev = fresh;
      setLayout(fresh);
    }

    const mouseX = a.mouseX;
    const targetScales = calculateTargetMagnification(
      mouseX,
      n,
      a.baseIconSize,
      a.baseSpacing,
      a.effectWidth,
      a.maxScale,
      min,
      a.reducedMotion
    );
    const targetPositions = calculatePositions(targetScales, a.baseIconSize, a.baseSpacing);

    const lerpFactor = a.reducedMotion ? 1 : mouseX !== null ? 0.22 : 0.14;

    const nextScales = prev.scales.map((s, i) => s + (targetScales[i] - s) * lerpFactor);
    const nextPositions = prev.positions.map((p, i) => p + (targetPositions[i] - p) * lerpFactor);

    const next: Layout = { scales: nextScales, positions: nextPositions };
    layoutRef.current = next;
    setLayout(next);

    const settled = isNearlySettled(nextScales, targetScales, nextPositions, targetPositions);
    if (!settled) {
      rafRef.current = requestAnimationFrame(() => {
        tickRef.current();
      });
    } else {
      runningRef.current = false;
      rafRef.current = 0;
    }
  }, []);

  React.useLayoutEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const ensureLoop = React.useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      tickRef.current();
    });
  }, []);

  React.useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  React.useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const L = createUniformLayout(itemCount, baseIconSize, baseSpacing);
      layoutRef.current = L;
      setLayout(L);
      mouseXRef.current = null;
      stopLoop();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [itemCount, baseIconSize, baseSpacing, stopLoop]);

  React.useEffect(() => {
    return () => {
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    };
  }, []);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = performance.now();
      if (now - lastMoveTsRef.current < 16) return;
      lastMoveTsRef.current = now;

      const rect = e.currentTarget.getBoundingClientRect();
      mouseXRef.current = e.clientX - rect.left;
      animRef.current.mouseX = mouseXRef.current;
      ensureLoop();
    },
    [ensureLoop]
  );

  const handleMouseLeave = React.useCallback(() => {
    mouseXRef.current = null;
    animRef.current.mouseX = null;
    ensureLoop();
  }, [ensureLoop]);

  const handleItemActivate = React.useCallback((id: string, onClick: () => void) => {
    if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    setBounceId(id);
    bounceTimeoutRef.current = setTimeout(() => {
      bounceTimeoutRef.current = null;
      setBounceId((cur) => (cur === id ? null : cur));
    }, 220);
    onClick();
  }, []);

  const resolvedScales =
    layout.scales.length === itemCount
      ? layout.scales
      : Array.from({ length: itemCount }, () => minScale);
  const resolvedPositions =
    layout.positions.length === itemCount
      ? layout.positions
      : calculatePositions(resolvedScales, baseIconSize, baseSpacing);

  const innerWidth = contentWidthFromLayout(resolvedPositions, resolvedScales, baseIconSize);

  if (itemCount === 0) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label={stripAriaLabel}
      className={cn('relative box-border h-full w-fit', className)}
    >
      <div
        className="relative mx-auto flex touch-none flex-row items-start justify-start overflow-visible"
        style={{
          height: `${baseIconSize}px`,
          width: `${innerWidth}px`,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {items.map((item, index) => {
          const scale = resolvedScales[index] ?? minScale;
          const position = resolvedPositions[index] ?? 0;
          const scaledSize = baseIconSize * scale;

          return (
            <div
              key={item.id}
              className="absolute flex flex-col items-center justify-end"
              style={{
                left: `${position - scaledSize / 2}px`,
                bottom: '5px',
                width: `${scaledSize - 10}px`,
                height: `${scaledSize - 10}px`,
                zIndex: Math.round(scale * 20),
              }}
            >
              <button
                type="button"
                aria-label={item.label}
                onClick={() => handleItemActivate(item.id, item.onClick)}
                className={cn(
                  'group relative flex h-full w-full flex-col items-center justify-center rounded-[5px] border outline-none transition-[box-shadow,background-color,border-color] duration-150',
                  'border-white/10 bg-white/5 shadow-inner',
                  'hover:bg-white/10 hover:border-white/20',
                  'focus-visible:border-cyan-400/60 focus-visible:ring-2 focus-visible:ring-cyan-400/40',
                  item.active &&
                    'border-white/25 bg-white/20 shadow-[inset_0_0_12px_rgba(255,255,255,0.12)]'
                )}
              >
                <span
                  className={cn(
                    'flex min-h-0 h-full w-full flex-1 flex-col items-center justify-center transition-transform duration-200 ease-out',
                    bounceId === item.id && !reducedMotion && '-translate-y-1.5'
                  )}
                >
                  <span className="flex h-full w-full min-h-0 min-w-0 flex-1 items-center justify-center text-inherit [&_svg]:h-[55%] [&_svg]:w-[55%] [&_svg]:max-h-[2.25rem] [&_svg]:max-w-[2.25rem]">
                    {item.node}
                  </span>
                  <span
                    className={cn(
                      'pointer-events-none absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white transition-opacity',
                      item.indicator ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                  />
                </span>

                <span
                  className={cn(
                    'pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-900/95 px-2 py-1 text-xs text-white/90 opacity-0 shadow-xl backdrop-blur-sm transition-opacity',
                    'group-hover:opacity-100 group-focus-visible:opacity-100'
                  )}
                >
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
