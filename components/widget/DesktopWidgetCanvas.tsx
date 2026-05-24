'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

import { useOS } from '@/components/os-context';
import { DraggableWidget } from '@/components/widget/DraggableWidget';
import { WeatherWidgetProvider } from '@/components/widget/WeatherWidgetProvider';
import { WidgetRenderer } from '@/components/widget/widget-renderers';
import { useWidgetLayout } from '@/hooks/use-widget-layout';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';
import { snapToGrid, findNearestNonOverlappingPos } from '@/lib/widget-layout-utils';
import { getWidgetDefinition, type WidgetType } from '@/lib/widget-registry';
import { ChevronUp, ChevronDown } from 'lucide-react';

function WidgetGridOverlay() {
  const { isWidgetEditMode } = useOS();
  if (!isWidgetEditMode) return null;

  const cols = 12;
  const rows = 8;
  const marginLeft = 2; // 2%
  const marginRight = 2; // 2%
  const marginTop = 5; // 5%
  const marginBottom = 14; // 14%

  const colWidth = (100 - marginLeft - marginRight) / cols;
  const rowHeight = (100 - marginTop - marginBottom) / rows;

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden animate-in fade-in duration-300">
      <svg className="w-full h-full opacity-35">
        <defs>
          <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0.12)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </radialGradient>
        </defs>

        {/* Active bounds background */}
        <rect
          x={`${marginLeft}%`}
          y={`${marginTop}%`}
          width={`${100 - marginLeft - marginRight}%`}
          height={`${100 - marginTop - marginBottom}%`}
          fill="url(#grid-glow)"
          stroke="rgba(6, 182, 212, 0.2)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          rx="12"
        />

        {/* Columns */}
        {Array.from({ length: cols + 1 }).map((_, i) => {
          const x = marginLeft + i * colWidth;
          return (
            <line
              key={`col-${i}`}
              x1={`${x}%`}
              y1={`${marginTop}%`}
              x2={`${x}%`}
              y2={`${100 - marginBottom}%`}
              stroke="rgba(6, 182, 212, 0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Rows */}
        {Array.from({ length: rows + 1 }).map((_, j) => {
          const y = marginTop + j * rowHeight;
          return (
            <line
              key={`row-${j}`}
              x1={`${marginLeft}%`}
              y1={`${y}%`}
              x2={`${100 - marginRight}%`}
              y2={`${y}%`}
              stroke="rgba(6, 182, 212, 0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Intersections (plus signs) */}
        {Array.from({ length: cols + 1 }).flatMap((_, i) => {
          const x = marginLeft + i * colWidth;
          return Array.from({ length: rows + 1 }).map((_, j) => {
            const y = marginTop + j * rowHeight;
            return (
              <g key={`point-${i}-${j}`} className="stroke-cyan-400/30" strokeWidth="1">
                <line x1={`calc(${x}% - 4px)`} y1={`${y}%`} x2={`calc(${x}% + 4px)`} y2={`${y}%`} />
                <line x1={`${x}%`} y1={`calc(${y}% - 4px)`} x2={`${x}%`} y2={`calc(${y}% + 4px)`} />
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

const SCREENS = [
  { id: 0, title: 'Dashboard', desc: 'Home & Productivity' },
  { id: 1, title: 'Workspaces', desc: 'Apps & Communication' },
  { id: 2, title: 'Diagnostics', desc: 'System & Status Info' },
];
const SCREENS_COUNT = SCREENS.length;

function ScreenSliderHUD({
  activeScreen,
  onChange,
}: {
  activeScreen: number;
  onChange: (idx: number) => void;
}) {
  return (
    <div className="hud-panel absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-50 pointer-events-auto select-none bg-slate-950/20 border border-white/15 backdrop-blur-2xl px-3.5 py-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/25 hover:bg-slate-950/30">
      {/* Up Arrow */}
      <button
        type="button"
        onClick={() => onChange(Math.max(activeScreen - 1, 0))}
        disabled={activeScreen === 0}
        className={cn(
          'p-1.5 rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all duration-300 focus:outline-none disabled:opacity-10 disabled:pointer-events-none',
          'hover:text-cyan-400 hover:bg-white/10 hover:border-cyan-500/30 hover:-translate-y-1 active:translate-y-0'
        )}
        aria-label="Previous screen"
      >
        <ChevronUp className="h-4 w-4 transition-transform duration-300" />
      </button>

      {/* Dots */}
      <div className="flex flex-col gap-5 py-2">
        {SCREENS.map((screen) => {
          const isActive = screen.id === activeScreen;
          return (
            <div
              key={screen.id}
              className="relative flex items-center justify-center group h-5 w-5"
            >
              {/* Tooltip */}
              <div
                className={cn(
                  'absolute right-8 opacity-0 scale-90 translate-x-3 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-right',
                  'group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0',
                  'bg-slate-950/85 border border-cyan-500/20 backdrop-blur-xl px-4 py-2.5 rounded-2xl text-right whitespace-nowrap shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
                )}
              >
                <div className="text-xs font-bold text-cyan-300 tracking-wide">{screen.title}</div>
                <div className="text-[10px] text-white/50 mt-0.5 font-medium">{screen.desc}</div>
              </div>

              {/* Dot */}
              <button
                type="button"
                onClick={() => onChange(screen.id)}
                className={cn(
                  'rounded-full transition-all duration-300 relative focus:outline-none flex items-center justify-center',
                  isActive
                    ? 'w-2.5 h-2.5 bg-cyan-400 scale-[2.1] shadow-[0_0_12px_rgba(34,211,238,0.8),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                    : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/70 hover:scale-[1.5]'
                )}
                aria-label={`Go to screen ${screen.id + 1}`}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-cyan-400/40 opacity-75 animate-duration-2000" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Down Arrow */}
      <button
        type="button"
        onClick={() => onChange(Math.min(activeScreen + 1, SCREENS_COUNT - 1))}
        disabled={activeScreen === SCREENS_COUNT - 1}
        className={cn(
          'p-1.5 rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all duration-300 focus:outline-none disabled:opacity-10 disabled:pointer-events-none',
          'hover:text-cyan-400 hover:bg-white/10 hover:border-cyan-500/30 hover:translate-y-1 active:translate-y-0'
        )}
        aria-label="Next screen"
      >
        <ChevronDown className="h-4 w-4 transition-transform duration-300" />
      </button>
    </div>
  );
}

export function DesktopWidgetCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLauncherOpen, isWidgetEditMode } = useOS();
  const { items, setItems, updatePosition, bringToFront, removeWidget, setEnabled } =
    useWidgetLayout();
  const isMobile = useIsMobile();
  const enabled = items.filter((w) => w.enabled);

  const [activeScreen, setActiveScreen] = useState(0);
  const lastScrollTimeRef = useRef(0);

  // Drag & Throw background states
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);

  // Boundary scroll timeout ref for widget edge dragging
  const boundaryScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (boundaryScrollTimeoutRef.current) {
        clearTimeout(boundaryScrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const maxStoredZ = items.reduce((m, w) => (w.enabled ? Math.max(m, w.zIndex ?? 1) : m), 0);
    // #region agent log
    fetch('http://127.0.0.1:7531/ingest/632941fc-04f7-4b75-9df5-2d52b029d540', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f051be' },
      body: JSON.stringify({
        sessionId: 'f051be',
        hypothesisId: 'H-Z1',
        location: 'DesktopWidgetCanvas.tsx:launcher-open',
        message: 'Widget z snapshot when launcher opens',
        data: { maxStoredZ, enabledCount: enabled.length, dimmed: true },
        timestamp: Date.now(),
        runId: 'layer-fix-v1',
      }),
    }).catch(() => {});
    // #endregion
  }, [isLauncherOpen, items, enabled.length]);

  // Handle wheel events to slide desktops
  useEffect(() => {
    if (isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest('[data-os-window]')) return;
      if (target.closest('[data-shell-overlay]')) return;
      if (target.closest('[data-widget-sidebar]')) return;
      if (target.closest('[data-widget-id]')) return; // Ignore scrolling inside widgets
      if (target.closest('.hud-panel')) return; // Ignore scrolling on the HUD

      const now = Date.now();
      if (now - lastScrollTimeRef.current < 600) return;

      if (e.deltaY > 30) {
        setActiveScreen((prev) => Math.min(prev + 1, SCREENS_COUNT - 1));
        lastScrollTimeRef.current = now;
      } else if (e.deltaY < -30) {
        setActiveScreen((prev) => Math.max(prev - 1, 0));
        lastScrollTimeRef.current = now;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isMobile]);

  // Handle keyboard ArrowUp/ArrowDown keys
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        setActiveScreen((prev) => Math.min(prev + 1, SCREENS_COUNT - 1));
      } else if (e.key === 'ArrowUp') {
        setActiveScreen((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  const handlePositionChange = useCallback(
    (id: string, proposedPos: { x: number; y: number }) => {
      const container = containerRef.current;
      if (!container) {
        updatePosition(id, proposedPos);
        return;
      }
      const cRect = container.getBoundingClientRect();
      const widgetItem = items.find((w) => w.id === id);
      if (!widgetItem) return;

      const resolved = findNearestNonOverlappingPos(
        id,
        widgetItem.type,
        proposedPos,
        items,
        cRect.width,
        cRect.height,
        widgetItem.screen ?? 0
      );

      if (resolved) {
        updatePosition(id, resolved);
      } else {
        console.log('No non-overlapping spot resolved, reverting drag position');
      }
    },
    [items, updatePosition]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isWidgetEditMode) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    [isWidgetEditMode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isWidgetEditMode) return;
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain') as WidgetType;
      if (!type) return;

      const container = containerRef.current;
      if (!container) return;

      const cRect = container.getBoundingClientRect();
      const dropX = (e.clientX - cRect.left) / cRect.width;
      const dropY = (e.clientY - cRect.top) / cRect.height;

      // proposed snapped position
      const snapped = snapToGrid({ x: dropX, y: dropY });

      const existing = items.find((w) => w.type === type);
      const id = existing?.id || `${type}-1`;

      const resolved = findNearestNonOverlappingPos(
        id,
        type,
        snapped,
        items,
        cRect.width,
        cRect.height,
        activeScreen
      );

      if (resolved) {
        setItems((prev) => {
          const exists = prev.some((w) => w.type === type);
          if (exists) {
            return prev.map((w) => {
              if (w.type === type) {
                return { ...w, enabled: true, position: resolved, screen: activeScreen };
              }
              return w;
            });
          } else {
            const def = getWidgetDefinition(type);
            return [
              ...prev,
              {
                id,
                type,
                enabled: true,
                position: resolved,
                zIndex: def.defaultZIndex,
                screen: activeScreen,
              },
            ];
          }
        });
      }
    },
    [items, isWidgetEditMode, setItems, activeScreen]
  );

  // Handle Drag & Throw background events
  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only primary clicks
    const target = e.target as HTMLElement;
    if (!target) return;

    // Don't drag background if clicking widgets, sidebars, active app windows, or HUD
    if (
      target.closest('[data-widget-id]') ||
      target.closest('[data-os-window]') ||
      target.closest('[data-shell-overlay]') ||
      target.closest('[data-widget-sidebar]') ||
      target.closest('.hud-panel')
    ) {
      return;
    }

    setIsDraggingBg(true);
    setDragOffset(0);
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = Date.now();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleBgPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingBg) return;
      let deltaY = e.clientY - dragStartYRef.current;

      // Elastic limits
      if (activeScreen === 0 && deltaY > 0) {
        deltaY = Math.pow(deltaY, 0.85);
      } else if (activeScreen === SCREENS_COUNT - 1 && deltaY < 0) {
        deltaY = -Math.pow(-deltaY, 0.85);
      }

      setDragOffset(deltaY);
    },
    [isDraggingBg, activeScreen]
  );

  const handleBgPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingBg) return;
      e.currentTarget.releasePointerCapture(e.pointerId);

      const duration = Date.now() - dragStartTimeRef.current;
      const deltaY = e.clientY - dragStartYRef.current;
      const velocity = duration > 0 ? deltaY / duration : 0; // px/ms

      setIsDraggingBg(false);
      setDragOffset(0);

      const ih = window.innerHeight;

      // Snap to next/prev screen if distance is 20% of viewport height or velocity > 0.4 px/ms
      if (deltaY > ih / 5 || velocity > 0.4) {
        setActiveScreen((prev) => Math.max(prev - 1, 0));
      } else if (deltaY < -ih / 5 || velocity < -0.4) {
        setActiveScreen((prev) => Math.min(prev + 1, SCREENS_COUNT - 1));
      }
    },
    [isDraggingBg]
  );

  const handleWidgetDragMove = useCallback(
    (e: React.PointerEvent, widgetId: string) => {
      const clientY = e.clientY;
      const thresh = 60;
      const ih = window.innerHeight;

      const nearTop = clientY < thresh;
      const nearBottom = ih - clientY < thresh;

      if (nearTop && activeScreen > 0) {
        if (!boundaryScrollTimeoutRef.current) {
          boundaryScrollTimeoutRef.current = setTimeout(() => {
            setActiveScreen((prev) => {
              const nextScreen = Math.max(prev - 1, 0);
              // Reassign widget screen immediately
              setItems((prevItems) =>
                prevItems.map((w) => (w.id === widgetId ? { ...w, screen: nextScreen } : w))
              );
              return nextScreen;
            });
            boundaryScrollTimeoutRef.current = null;
          }, 800);
        }
      } else if (nearBottom && activeScreen < SCREENS_COUNT - 1) {
        if (!boundaryScrollTimeoutRef.current) {
          boundaryScrollTimeoutRef.current = setTimeout(() => {
            setActiveScreen((prev) => {
              const nextScreen = Math.min(prev + 1, SCREENS_COUNT - 1);
              // Reassign widget screen immediately
              setItems((prevItems) =>
                prevItems.map((w) => (w.id === widgetId ? { ...w, screen: nextScreen } : w))
              );
              return nextScreen;
            });
            boundaryScrollTimeoutRef.current = null;
          }, 800);
        }
      } else {
        if (boundaryScrollTimeoutRef.current) {
          clearTimeout(boundaryScrollTimeoutRef.current);
          boundaryScrollTimeoutRef.current = null;
        }
      }
    },
    [activeScreen, setItems]
  );

  const handleWidgetDragEnd = useCallback(() => {
    if (boundaryScrollTimeoutRef.current) {
      clearTimeout(boundaryScrollTimeoutRef.current);
      boundaryScrollTimeoutRef.current = null;
    }
  }, []);

  return (
    <WeatherWidgetProvider>
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 z-0 transition-opacity duration-200 pointer-events-auto outline-none',
          isLauncherOpen && !isMobile && 'opacity-0',
          isMobile && 'flex flex-col items-stretch justify-end gap-3 p-4 pb-36 pt-24'
        )}
        aria-label="Desktop widgets"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerDown={handleBgPointerDown}
        onPointerMove={handleBgPointerMove}
        onPointerUp={handleBgPointerUp}
        onPointerCancel={handleBgPointerUp}
      >
        {isMobile ? (
          <div className="pointer-events-auto flex w-full max-w-md flex-col items-stretch justify-end gap-3 p-4 pb-36 pt-24">
            {enabled.map((item) => (
              <WidgetRenderer
                key={item.id}
                item={item}
                onRemove={() => removeWidget(item.id)}
                onConfigure={() => setEnabled(item.id, false)}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 overflow-hidden select-none">
            <div
              className={cn(
                'w-full h-full flex flex-col',
                isDraggingBg
                  ? 'transition-none'
                  : 'transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]'
              )}
              style={{
                transform: `translate3d(0, calc(-${activeScreen * 100}% + ${dragOffset}px), 0)`,
              }}
            >
              {Array.from({ length: SCREENS_COUNT }).map((_, screenIdx) => {
                const screenWidgets = enabled.filter((w) => (w.screen ?? 0) === screenIdx);
                return (
                  <div key={screenIdx} className="h-screen w-full relative shrink-0">
                    <WidgetGridOverlay />
                    {screenWidgets.map((item) => (
                      <DraggableWidget
                        key={item.id}
                        item={item}
                        containerRef={containerRef}
                        onPositionChange={handlePositionChange}
                        onBringToFront={bringToFront}
                        onRemove={() => removeWidget(item.id)}
                        onDragMove={(e) => handleWidgetDragMove(e, item.id)}
                        onDragEnd={handleWidgetDragEnd}
                      >
                        <WidgetRenderer
                          item={item}
                          onRemove={() => removeWidget(item.id)}
                          onConfigure={() => setEnabled(item.id, false)}
                        />
                      </DraggableWidget>
                    ))}
                  </div>
                );
              })}
            </div>
            <ScreenSliderHUD activeScreen={activeScreen} onChange={setActiveScreen} />
          </div>
        )}
      </div>
    </WeatherWidgetProvider>
  );
}
