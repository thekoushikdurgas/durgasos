'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import styles from './TuggableBulbThemeToggle.module.css';

const CORD_X1 = 98.7255;
const CORD_Y1 = 240.5405;
const END_X2 = 98.7255;
const END_Y2 = 380.5405;
const TUG_THRESHOLD_PX = 50;

function finiteCord(p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Number.isFinite(p.x) ? p.x : END_X2,
    y: Number.isFinite(p.y) ? p.y : END_Y2,
  };
}

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: END_X2, y: END_Y2 };
  try {
    const inv = ctm.inverse();
    const out = pt.matrixTransform(inv);
    return finiteCord(out);
  } catch {
    return { x: END_X2, y: END_Y2 };
  }
}

function springLineTo(
  from: { x: number; y: number },
  to: { x: number; y: number },
  apply: (next: { x: number; y: number }) => void,
  durationMs = 200
): Promise<void> {
  const fromSafe = finiteCord(from);
  const toSafe = finiteCord(to);
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const e = 1 - (1 - t) ** 3;
      apply(
        finiteCord({
          x: fromSafe.x + (toSafe.x - fromSafe.x) * e,
          y: fromSafe.y + (toSafe.y - fromSafe.y) * e,
        })
      );
      if (t < 1) requestAnimationFrame(tick);
      else {
        apply(toSafe);
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Pull the cord to toggle theme (see docs/uiux/tuggable-light-bulb-gsap-draggable-morphsvg).
 * No GSAP / MorphSVG — pointer-driven cord + spring reset; bulb “lit” follows light theme.
 */
export function TuggableBulbThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const reactId = useId().replace(/:/g, '');
  const [mounted, setMounted] = useState(false);
  const [cord, setCord] = useState({ x: END_X2, y: END_Y2 });
  const [wobbleCount, setWobbleCount] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const cordRef = useRef({ x: END_X2, y: END_Y2 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = !mounted ? false : resolvedTheme === 'light';

  const triggerWobble = useCallback(() => {
    setWobbleCount((c) => c + 1);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!mounted || !svgRef.current) return;
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!dragStartRef.current || !svgRef.current) return;
    const p = clientToSvg(svgRef.current, e.clientX, e.clientY);
    cordRef.current = p;
    setCord(p);
  };

  const onPointerUp = async (e: React.PointerEvent<SVGCircleElement>) => {
    if (!dragStartRef.current || !svgRef.current) {
      return;
    }
    const start = dragStartRef.current;
    dragStartRef.current = null;
    try {
      (e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const travelled = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const from = finiteCord(cordRef.current);

    if (travelled > TUG_THRESHOLD_PX && mounted) {
      setTheme(isLight ? 'dark' : 'light');
      triggerWobble();
    }

    await springLineTo(from, { x: END_X2, y: END_Y2 }, (next) => {
      cordRef.current = next;
      setCord(next);
    });
  };

  const onKeyTheme = () => {
    if (!mounted) return;
    setTheme(isLight ? 'dark' : 'light');
    triggerWobble();
  };

  const mid = `${reactId}`;
  const cordLine = finiteCord(cord);

  return (
    <div
      className={styles.host}
      data-lit={isLight ? '1' : '0'}
      aria-label="Theme: pull the cord down to switch light or dark mode"
    >
      <button
        type="button"
        className={styles.srToggle}
        tabIndex={0}
        disabled={!mounted}
        onClick={onKeyTheme}
      >
        Toggle light or dark theme
      </button>
      <svg
        ref={svgRef}
        className={`toggle-scene ${mounted ? styles.svgReady : styles.svgPending}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMin meet"
        viewBox="0 0 197.451 481.081"
        aria-hidden
      >
        <defs>
          <marker id={`${mid}-ma`} orient="auto" overflow="visible" refX={0} refY={0}>
            <path
              className="toggle-scene__cord-end"
              fillRule="evenodd"
              strokeWidth={0.2666}
              d="M.98 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </marker>
          <clipPath id={`${mid}-cg`} clipPathUnits="userSpaceOnUse">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4.677}
              d="M-774.546 827.629s12.917-13.473 29.203-13.412c16.53.062 29.203 13.412 29.203 13.412v53.6s-8.825 16-29.203 16c-21.674 0-29.203-16-29.203-16z"
            />
          </clipPath>
        </defs>
        <g className="toggle-scene__cords">
          <path
            className="toggle-scene__cord"
            markerEnd={`url(#${mid}-ma)`}
            fill="none"
            strokeLinecap="square"
            strokeWidth={6}
            d="M123.228-28.56v150.493"
            transform="translate(-24.503 256.106)"
          />
          <path
            className="toggle-scene__cord"
            markerEnd={`url(#${mid}-ma)`}
            fill="none"
            strokeLinecap="square"
            strokeWidth={6}
            d="M123.228-28.59s28 8.131 28 19.506-18.667 13.005-28 19.507c-9.333 6.502-28 8.131-28 19.506s28 19.507 28 19.507"
            transform="translate(-24.503 256.106)"
          />
          <path
            className="toggle-scene__cord"
            markerEnd={`url(#${mid}-ma)`}
            fill="none"
            strokeLinecap="square"
            strokeWidth={6}
            d="M123.228-28.575s-20 16.871-20 28.468c0 11.597 13.333 18.978 20 28.468 6.667 9.489 20 16.87 20 28.467 0 11.597-20 28.468-20 28.468"
            transform="translate(-24.503 256.106)"
          />
          <path
            className="toggle-scene__cord"
            markerEnd={`url(#${mid}-ma)`}
            fill="none"
            strokeLinecap="square"
            strokeWidth={6}
            d="M123.228-28.569s16 20.623 16 32.782c0 12.16-10.667 21.855-16 32.782-5.333 10.928-16 20.623-16 32.782 0 12.16 16 32.782 16 32.782"
            transform="translate(-24.503 256.106)"
          />
          <path
            className="toggle-scene__cord"
            markerEnd={`url(#${mid}-ma)`}
            fill="none"
            strokeLinecap="square"
            strokeWidth={6}
            d="M123.228-28.563s-10 24.647-10 37.623c0 12.977 6.667 25.082 10 37.623 3.333 12.541 10 24.647 10 37.623 0 12.977-10 37.623-10 37.623"
            transform="translate(-24.503 256.106)"
          />
          <g className="line toggle-scene__dummy-cord">
            <line
              markerEnd={`url(#${mid}-ma)`}
              x1={CORD_X1}
              y1={CORD_Y1}
              x2={cordLine.x}
              y2={cordLine.y}
            />
          </g>
          <circle
            className="toggle-scene__hit-spot"
            cx={98.7255}
            cy={380.5405}
            r={60}
            fill="transparent"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </g>
        <g className="toggle-scene__bulb bulb" transform="translate(844.069 -645.213)">
          <g key={`wobble-${wobbleCount}`} className={wobbleCount > 0 ? styles.wobble : undefined}>
            <path
              className="bulb__cap"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4.677}
              d="M-774.546 827.629s12.917-13.473 29.203-13.412c16.53.062 29.203 13.412 29.203 13.412v53.6s-8.825 16-29.203 16c-21.674 0-29.203-16-29.203-16z"
            />
            <path
              className="bulb__cap-shine"
              d="M-778.379 802.873h25.512v118.409h-25.512z"
              clipPath={`url(#${mid}-cg)`}
              transform="matrix(.52452 0 0 .90177 -368.282 82.976)"
            />
            <path
              className="bulb__cap"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4}
              d="M-774.546 827.629s12.917-13.473 29.203-13.412c16.53.062 29.203 13.412 29.203 13.412v0s-8.439 10.115-28.817 10.115c-21.673 0-29.59-10.115-29.59-10.115z"
            />
            <path
              className="bulb__cap-outline"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4.677}
              d="M-774.546 827.629s12.917-13.473 29.203-13.412c16.53.062 29.203 13.412 29.203 13.412v53.6s-8.825 16-29.203 16c-21.674 0-29.203-16-29.203-16z"
            />
            <g className="bulb__filament" fill="none" strokeLinecap="round" strokeWidth={5}>
              <path d="M-752.914 823.875l-8.858-33.06" />
              <path d="M-737.772 823.875l8.858-33.06" />
            </g>
            <path
              className="bulb__bulb"
              strokeLinecap="round"
              strokeWidth={5}
              d="M-783.192 803.855c5.251 8.815 5.295 21.32 13.272 27.774 12.299 8.045 36.46 8.115 49.127 0 7.976-6.454 8.022-18.96 13.273-27.774 3.992-6.7 14.408-19.811 14.408-19.811 8.276-11.539 12.769-24.594 12.769-38.699 0-35.898-29.102-65-65-65-35.899 0-65 29.102-65 65 0 13.667 4.217 26.348 12.405 38.2 0 0 10.754 13.61 14.746 20.31z"
            />
            <circle
              className="bulb__flash"
              cx={-745.343}
              cy={743.939}
              r={83.725}
              fill="none"
              strokeDasharray="10,30"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={10}
            />
            <path
              className="bulb__shine"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={12}
              d="M-789.19 757.501a45.897 45.897 0 013.915-36.189 45.897 45.897 0 0129.031-21.957"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
