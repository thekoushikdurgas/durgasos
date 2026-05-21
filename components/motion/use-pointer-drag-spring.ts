'use client';

import { useCallback, useRef, useState } from 'react';

import { dragSnapSpring } from '@/lib/motion/spring-presets';
import { toSpringValue } from '@/lib/motion/spring-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

export type DragSpringState = {
  x: number;
  y: number;
  dragging: boolean;
};

export function usePointerDragSpring(initial: { x: number; y: number }) {
  const reduced = usePrefersReducedMotion();
  const [target, setTarget] = useState(initial);
  const [drag, setDrag] = useState<DragSpringState | null>(null);
  const startRef = useRef({ x: 0, y: 0, pointerX: 0, pointerY: 0 });

  const style = {
    x: drag != null ? drag.x : toSpringValue(target.x, reduced, dragSnapSpring),
    y: drag != null ? drag.y : toSpringValue(target.y, reduced, dragSnapSpring),
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      startRef.current = {
        x: target.x,
        y: target.y,
        pointerX: e.clientX,
        pointerY: e.clientY,
      };
      setDrag({
        x: target.x,
        y: target.y,
        dragging: true,
      });
    },
    [target.x, target.y]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag?.dragging) return;
      const dx = e.clientX - startRef.current.pointerX;
      const dy = e.clientY - startRef.current.pointerY;
      setDrag({
        x: startRef.current.x + dx,
        y: startRef.current.y + dy,
        dragging: true,
      });
    },
    [drag?.dragging]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      if (drag) {
        setTarget({ x: drag.x, y: drag.y });
      }
      setDrag(null);
    },
    [drag]
  );

  const setPosition = useCallback((x: number, y: number) => {
    setTarget({ x, y });
    setDrag(null);
  }, []);

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerMoveCapture: onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return { style, dragHandlers, setPosition, target, dragging: drag?.dragging ?? false };
}
