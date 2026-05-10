'use client';

import { useEffect, useRef } from 'react';

export interface StarsCanvasProps {
  transparent?: boolean;
  maxStars?: number;
  hue?: number;
  brightness?: number;
  speedMultiplier?: number;
  twinkleIntensity?: number;
  className?: string;
  paused?: boolean;
}

type Star = {
  orbitRadius: number;
  radius: number;
  orbitX: number;
  orbitY: number;
  timePassed: number;
  speed: number;
  alpha: number;
};

function randomInt(min: number, max?: number): number {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function maxOrbitRadius(x: number, y: number): number {
  const max = Math.max(x, y);
  const diameter = Math.round(Math.sqrt(max * max + max * max));
  return diameter / 2;
}

function createStar(
  w: number,
  h: number,
  maxStars: number,
  speedMultiplier: number,
  brightness: number
): Star {
  const orbitRadius = randomInt(maxOrbitRadius(w, h));
  return {
    orbitRadius,
    radius: randomInt(60, orbitRadius) / 12,
    orbitX: w / 2,
    orbitY: h / 2,
    timePassed: randomInt(0, maxStars),
    speed: (randomInt(orbitRadius) / 50000) * speedMultiplier,
    alpha: Math.min(1, (randomInt(2, 10) / 10) * (brightness / 10)),
  };
}

function drawStar(
  star: Star,
  g: CanvasRenderingContext2D,
  canvas2: HTMLCanvasElement,
  twinkleIntensity: number,
  paused: boolean,
  random: typeof randomInt
): void {
  const x = Math.sin(star.timePassed) * star.orbitRadius + star.orbitX;
  const y = Math.cos(star.timePassed) * star.orbitRadius + star.orbitY;
  const twinkle = random(twinkleIntensity);

  if (twinkle === 1 && star.alpha > 0) {
    star.alpha -= 0.05;
  } else if (twinkle === 2 && star.alpha < 1) {
    star.alpha += 0.05;
  }

  g.globalAlpha = Math.min(1, Math.max(0, star.alpha));
  g.drawImage(canvas2, x - star.radius / 2, y - star.radius / 2, star.radius, star.radius);
  if (!paused) star.timePassed += star.speed;
}

export function StarsCanvas({
  transparent = false,
  maxStars = 1200,
  hue = 217,
  brightness = 10,
  speedMultiplier = 1,
  twinkleIntensity = 20,
  className = '',
  paused = false,
}: StarsCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = ctx;

    let w = 1;
    let h = 1;

    const syncSize = () => {
      const rect = wrapper.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.floor(rect.width));
      h = canvas.height = Math.max(1, Math.floor(rect.height));
    };

    syncSize();

    let stars: Star[] = [];

    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d');
    if (!ctx2) return;
    canvas2.width = 100;
    canvas2.height = 100;
    const half = canvas2.width / 2;

    const rebuildGradient = () => {
      const gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
      gradient2.addColorStop(0.025, '#fff');
      gradient2.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
      gradient2.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
      gradient2.addColorStop(1, 'transparent');
      ctx2.fillStyle = gradient2;
      ctx2.beginPath();
      ctx2.arc(half, half, half, 0, Math.PI * 2);
      ctx2.fill();
    };

    rebuildGradient();

    const rebuildStars = () => {
      stars = [];
      for (let i = 0; i < maxStars; i++) {
        stars.push(createStar(w, h, maxStars, speedMultiplier, brightness));
      }
    };

    rebuildStars();

    const drawFrame = () => {
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 0.8;
      g.fillStyle = transparent ? 'hsla(217, 64%, 6%, 0)' : 'hsla(217, 64%, 6%, 1)';
      g.fillRect(0, 0, w, h);

      g.globalCompositeOperation = 'lighter';
      for (const star of stars) {
        drawStar(star, g, canvas2, twinkleIntensity, paused, randomInt);
      }
    };

    const tick = () => {
      drawFrame();
      animationRef.current = requestAnimationFrame(tick);
    };

    const handleResize = () => {
      syncSize();
      rebuildStars();
      drawFrame();
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(wrapper);

    drawFrame();
    if (!paused) {
      animationRef.current = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [transparent, maxStars, hue, brightness, speedMultiplier, twinkleIntensity, paused]);

  return (
    <div ref={wrapperRef} className={`absolute inset-0 ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" style={{ display: 'block' }} />
    </div>
  );
}
