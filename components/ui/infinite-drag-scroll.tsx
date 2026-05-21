'use client';

import { Motion } from 'react-motion';
import { cva } from 'class-variance-authority';
import { createContext, memo, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { SpringBox } from '@/components/motion/SpringBox';
import { dragSnapSpring } from '@/lib/motion/spring-presets';
import { toSpringValue } from '@/lib/motion/spring-style';
import { useReducedMotionStyle } from '@/lib/motion/use-reduced-motion-style';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export type InfiniteDragVariant = 'default' | 'masonry' | 'polaroid';

const GridVariantContext = createContext<InfiniteDragVariant | undefined>(undefined);

function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export const DraggableContainer = ({
  className,
  children,
  variant,
}: {
  className?: string;
  children: React.ReactNode;
  variant?: InfiniteDragVariant;
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();

  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, pointerX: 0, pointerY: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const handleIsDragging = () => setIsDragging(true);
  const handleIsNotDragging = () => setIsDragging(false);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      dragStartRef.current = {
        x: scroll.x,
        y: scroll.y,
        pointerX: e.clientX,
        pointerY: e.clientY,
      };
      setDrag({ x: scroll.x, y: scroll.y });
      handleIsDragging();
    },
    [scroll.x, scroll.y]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - dragStartRef.current.pointerX;
      const dy = e.clientY - dragStartRef.current.pointerY;
      setDrag({
        x: dragStartRef.current.x + dx,
        y: dragStartRef.current.y + dy,
      });
    },
    [drag]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      if (drag) {
        setScroll({ x: drag.x, y: drag.y });
      }
      setDrag(null);
      handleIsNotDragging();
    },
    [drag]
  );

  useEffect(() => {
    if (!ref.current) return;
    const initialRect = ref.current.getBoundingClientRect();
    setDimensions({ width: initialRect.width, height: initialRect.height });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    });

    resizeObserver.observe(ref.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const handleWheelScroll = (event: WheelEvent) => {
      if (!isDragging) {
        setScroll((prev) => ({
          ...prev,
          y: prev.y - event.deltaY * 2.7,
        }));
      }
    };

    root?.addEventListener('wheel', handleWheelScroll, { passive: true });
    return () => {
      root?.removeEventListener('wheel', handleWheelScroll);
    };
  }, [isDragging]);

  const rawX = drag?.x ?? scroll.x;
  const rawY = drag?.y ?? scroll.y;
  const width = dimensions.width;
  const height = dimensions.height;
  const wrappedX = width ? wrap(-(width / 2), 0, rawX) : rawX;
  const wrappedY = height ? wrap(-(height / 2), 0, rawY) : rawY;

  const motionStyle = {
    x: drag != null ? wrappedX : toSpringValue(wrappedX, reduced, dragSnapSpring),
    y: drag != null ? wrappedY : toSpringValue(wrappedY, reduced, dragSnapSpring),
  };

  return (
    <GridVariantContext.Provider value={variant}>
      <div ref={rootRef} className="h-full min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-0 overflow-hidden">
          <Motion style={motionStyle}>
            {(interpolated) => (
              <div
                ref={ref}
                className={cn(
                  'grid h-fit w-fit cursor-grab grid-cols-[repeat(2,1fr)] bg-[#141414] will-change-transform active:cursor-grabbing',
                  className
                )}
                style={{
                  transform: `translate3d(${interpolated.x}px, ${interpolated.y}px, 0)`,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onMouseDown={handleIsDragging}
                onMouseUp={handleIsNotDragging}
                onMouseLeave={handleIsNotDragging}
              >
                {children}
              </div>
            )}
          </Motion>
        </div>
      </div>
    </GridVariantContext.Provider>
  );
};

export const GridItem = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const variant = useContext(GridVariantContext);
  const enterStyle = useReducedMotionStyle({ opacity: 1, scale: 1 }, dragSnapSpring);

  const gridItemStyles = cva(
    'h-full w-full overflow-hidden will-change-transform hover:cursor-pointer',
    {
      variants: {
        variant: {
          default: 'rounded-sm',
          masonry: 'even:mt-[60%] rounded-sm',
          polaroid:
            'border-10 border-b-28 border-white shadow-xl transition-transform duration-300 ease-out even:mt-[60%] even:rotate-3 odd:-rotate-2 hover:rotate-0',
        },
      },
      defaultVariants: {
        variant: 'default',
      },
    }
  );

  return (
    <SpringBox
      className={cn(gridItemStyles({ variant, className }))}
      defaultStyle={{ opacity: 0, scale: 0.3 }}
      style={enterStyle}
      mapStyle={(s) => ({
        opacity: s.opacity,
        transform: `scale(${s.scale ?? 1})`,
      })}
    >
      {children}
    </SpringBox>
  );
};

export const GridBody = memo(
  ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const variant = useContext(GridVariantContext);

    const gridBodyStyles = cva('grid h-fit w-fit grid-cols-[repeat(6,1fr)]', {
      variants: {
        variant: {
          default: 'gap-14 p-7 md:gap-28 md:p-14',
          masonry: 'gap-x-14 px-7 md:gap-x-28 md:px-14',
          polaroid: 'gap-x-14 px-7 md:gap-x-28 md:px-14',
        },
      },
      defaultVariants: {
        variant: 'default',
      },
    });

    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={cn(gridBodyStyles({ variant, className }))}>
            {children}
          </div>
        ))}
      </>
    );
  }
);

GridBody.displayName = 'GridBody';
