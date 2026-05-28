'use client';

type SpeedometerArcProps = {
  speedKmh: number;
  maxKmh?: number;
  size?: number;
};

/** Arc gauge inspired by Road-Rash-master dashboard.js speedoMeter */
export function SpeedometerArc({ speedKmh, maxKmh = 220, size = 140 }: SpeedometerArcProps) {
  const pct = Math.min(1, Math.max(0, speedKmh / maxKmh));
  const angle = -180 + pct * 180;
  const r = (size - 28) / 2;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const rad = (angle * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const largeArc = pct > 0.5 ? 1 : 0;
  const color = pct < 0.55 ? '#22c55e' : pct < 0.8 ? '#eab308' : '#ef4444';
  const glowId = `rr-speedo-glow-${size}`;

  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox={`0 0 ${size} ${size * 0.72}`}
      role="img"
      aria-label={`Speed ${Math.round(speedKmh)} kilometers per hour`}
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {pct > 0.01 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />
      )}
      <line
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.9}
      />
      <circle cx={cx} cy={cy} r="5" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill={color}
        fontSize="26"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
      >
        {Math.round(speedKmh)}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill="rgba(255,255,255,0.45)"
        fontSize="9"
        fontWeight="700"
        letterSpacing="0.15em"
      >
        KM/H
      </text>
    </svg>
  );
}
