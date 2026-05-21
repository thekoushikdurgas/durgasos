'use client';

import { useMemo, useState } from 'react';

const WEEKS = 52;
const DAYS = 7;

/** Decorative contribution-style heatmap (not live GitHub data). */
export function ContributionGraph() {
  const [year] = useState(() => new Date().getFullYear());
  const cells = useMemo(() => {
    const out: { key: string; level: number }[] = [];
    for (let w = 0; w < WEEKS; w += 1) {
      for (let d = 0; d < DAYS; d += 1) {
        const t = Math.sin(w * 0.35 + d * 0.7) * 0.5 + 0.5;
        const level = Math.min(4, Math.floor(t * 5));
        out.push({ key: `${w}-${d}`, level });
      }
    }
    return out;
  }, []);

  const levelClass: Record<number, string> = {
    0: 'bg-white/[0.04]',
    1: 'bg-emerald-500/25',
    2: 'bg-emerald-500/45',
    3: 'bg-emerald-500/65',
    4: 'bg-emerald-500/85',
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/85">Contributions</h4>
        <span className="text-[11px] text-white/40">{year} (illustrative)</span>
      </div>
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.key}
            title="Illustrative activity"
            className={`aspect-square min-h-[10px] rounded-[2px] ${levelClass[c.level] ?? levelClass[0]}`}
          />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-white/35">
        Heatmap is a visual placeholder; live contribution data requires the GitHub GraphQL API.
      </p>
    </div>
  );
}
