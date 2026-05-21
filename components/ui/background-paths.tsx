'use client';

function FloatingPaths({ position, animate }: { position: number; animate: boolean }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    opacity: 0.1 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-300/90"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>Background paths</title>
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            style={
              animate
                ? {
                    opacity: path.opacity,
                    animation: `pulse ${20 + (path.id % 10)}s ease-in-out infinite`,
                    animationDelay: `${path.id * 0.15}s`,
                  }
                : { strokeOpacity: Math.min(0.35, 0.12 + path.id * 0.006) }
            }
          />
        ))}
      </svg>
    </div>
  );
}

/** Flowing curves from app_background.md (kokonutd paths); no hero content. */
export function BackgroundPathsDesktop({ animate }: { animate: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1c2c]">
      <FloatingPaths position={1} animate={animate} />
      <FloatingPaths position={-1} animate={animate} />
    </div>
  );
}
