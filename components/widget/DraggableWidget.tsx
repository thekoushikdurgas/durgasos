'use client';

import { useCallback, useMemo, useRef } from 'react';
import { GripVertical, Move } from 'lucide-react';

import { SpringBox } from '@/components/motion/SpringBox';
import { usePointerDragSpring } from '@/components/motion/use-pointer-drag-spring';
import { useOS } from '@/components/os-context';
import { clampWidgetZIndex, MAX_DESKTOP_WIDGET_Z_INDEX } from '@/lib/shell-z-index';
import { anchorTransform, resolveDropPosition } from '@/lib/widget-layout-utils';
import { getWidgetDefinition, type WidgetLayoutItem } from '@/lib/widget-registry';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';

type Props = {
  item: WidgetLayoutItem;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onBringToFront: (id: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function DraggableWidget({
  item,
  containerRef,
  onPositionChange,
  onBringToFront,
  children,
  className,
}: Props) {
  const { isWidgetEditMode } = useOS();
  const isMobile = useIsMobile();
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef(item.position);
  const dragPointerRef = useRef({ posX: 0, posY: 0, pointerX: 0, pointerY: 0 });
  const def = getWidgetDefinition(item.type);
  const canDrag = isWidgetEditMode && !isMobile;

  const {
    style: dragStyle,
    dragHandlers,
    setPosition,
  } = usePointerDragSpring({
    x: 0,
    y: 0,
  });

  const handleDragOverlayPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartPosRef.current = item.position;
      const posX = typeof dragStyle.x === 'number' ? dragStyle.x : 0;
      const posY = typeof dragStyle.y === 'number' ? dragStyle.y : 0;
      dragPointerRef.current = { posX, posY, pointerX: e.clientX, pointerY: e.clientY };
      dragHandlers.onPointerDown(e);
    },
    [dragHandlers, dragStyle.x, dragStyle.y, item.position]
  );

  const handleDragOverlayPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const dx = e.clientX - dragPointerRef.current.pointerX;
      const dy = e.clientY - dragPointerRef.current.pointerY;
      const offsetX = dragPointerRef.current.posX + dx;
      const offsetY = dragPointerRef.current.posY + dy;

      dragHandlers.onPointerUp(e);

      const node = nodeRef.current;
      const container = containerRef.current;
      if (!node || !container) return;

      const cRect = container.getBoundingClientRect();
      const nRect = node.getBoundingClientRect();
      const next = resolveDropPosition(
        def.anchor,
        dragStartPosRef.current,
        offsetX,
        offsetY,
        nRect,
        cRect
      );

      onPositionChange(item.id, next);
      setPosition(0, 0);
    },
    [containerRef, def.anchor, dragHandlers, item.id, onPositionChange, setPosition]
  );

  const dragOverlayHandlers = {
    onPointerDown: handleDragOverlayPointerDown,
    onPointerMove: dragHandlers.onPointerMove,
    onPointerMoveCapture: dragHandlers.onPointerMoveCapture,
    onPointerUp: handleDragOverlayPointerUp,
    onPointerCancel: handleDragOverlayPointerUp,
  };

  const x = typeof dragStyle.x === 'number' ? dragStyle.x : 0;
  const y = typeof dragStyle.y === 'number' ? dragStyle.y : 0;
  const motionStyle = useMemo(() => ({ x, y }), [x, y]);

  return (
    <SpringBox
      as="div"
      className={cn('pointer-events-auto absolute max-w-[min(100vw-1rem,42rem)]', className)}
      style={motionStyle}
      mapStyle={(s) => ({
        position: 'absolute',
        left: `${item.position.x * 100}%`,
        top: `${item.position.y * 100}%`,
        transform: `${anchorTransform(def.anchor)} translate3d(${s.x ?? 0}px, ${s.y ?? 0}px, 0)`,
        zIndex: canDrag
          ? MAX_DESKTOP_WIDGET_Z_INDEX
          : clampWidgetZIndex(item.zIndex ?? def.defaultZIndex),
      })}
    >
      <div
        ref={nodeRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          onBringToFront(item.id);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {canDrag ? (
          <>
            <div
              role="presentation"
              aria-hidden
              className="absolute inset-0 z-20 cursor-grab rounded-2xl border-2 border-dashed border-cyan-400/50 bg-cyan-500/5 active:cursor-grabbing"
              {...dragOverlayHandlers}
            />
            <div className="relative z-30 mb-1 flex items-center justify-center gap-1 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-cyan-200 backdrop-blur-sm pointer-events-none">
              <Move className="h-3 w-3" aria-hidden />
              <GripVertical className="h-3 w-3" aria-hidden />
              Drag anywhere on widget
            </div>
          </>
        ) : null}
        <div className={cn('relative', canDrag && 'pointer-events-none z-10 select-none')}>
          {children}
        </div>
      </div>
    </SpringBox>
  );
}
